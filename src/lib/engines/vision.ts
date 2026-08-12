import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude Vision 기반 실제 이미지 분석.
 *  (1) 내용 라벨링 — 도시/도로/시설/환경 데이터에 맞는 한국어 태그
 *  (2) 개인정보 탐지 — 얼굴·차량 번호판·개인 식별정보의 정규화 bbox
 * 두 결과를 단일 호출로 받아 라벨링과 마스킹에 함께 사용한다.
 * API 키 미설정·호출 실패 시 aiPowered:false 로 폴백(규칙기반 라벨 + 폴백 마스킹)한다.
 */

export type PiiRegion = {
  x: number; // 좌상단 x (정규화 0~1)
  y: number; // 좌상단 y (정규화 0~1)
  w: number; // 너비 (정규화 0~1)
  h: number; // 높이 (정규화 0~1)
  kind: string; // face | plate | id | ...
};

export type VisionResult = {
  labels: string[];
  piiRegions: PiiRegion[];
  aiPowered: boolean; // 실제 Claude 분석이 수행되었는지
};

const EMPTY: VisionResult = { labels: [], piiRegions: [], aiPowered: false };

// 비전 모델 — 기본 Opus(최고 정밀도). 제출 건당 1회 호출(시드 더미는 호출 없음)이라
// 시연 볼륨에서 비용 무시 가능. 비용 절감이 필요하면 .env의 VISION_MODEL로 하향 가능
// (claude-sonnet-5 / claude-haiku-4-5 — 라벨 품질은 동급, bbox만 조금 덜 정밀).
const MODEL = process.env.VISION_MODEL || "claude-opus-4-8";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  if (!client) client = new Anthropic({ apiKey: key });
  return client;
}

const SUPPORTED_MEDIA = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function parseDataUrl(
  dataUrl: string
): { mediaType: string; base64: string } | null {
  if (!dataUrl.startsWith("data:")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const header = dataUrl.slice(5, comma); // 예: "image/jpeg;base64"
  if (!header.includes(";base64")) return null;
  const mediaType = header.split(";")[0].toLowerCase();
  const base64 = dataUrl.slice(comma + 1);
  if (!SUPPORTED_MEDIA.has(mediaType) || !base64) return null;
  return { mediaType, base64 };
}

const PROMPT = `당신은 시민참여형 현실세계 데이터 수집 플랫폼의 이미지 정제 엔진입니다.
업로드된 현장 사진을 분석해 아래 두 가지를 수행하고 **JSON만** 출력하세요.

1) labels: 이미지 내용을 설명하는 한국어 태그 3~6개.
   - 도로/보도/시설/환경 데이터 관점에서 구체적으로. 예: "보도블록", "노면 균열", "도로표지판", "가로수", "하천", "건축물", "차량", "보행자".
   - 관련 없는 태그·중복·문장 금지. 짧은 명사구만.

2) pii: 개인정보로 마스킹이 필요한 영역의 경계상자 목록.
   - 대상: 사람 얼굴(face), 차량 번호판(plate), 판독 가능한 개인 식별정보(id).
   - 좌표는 이미지 크기 대비 **정규화(0~1)**. x,y=경계상자 좌상단, w,h=너비/높이.
   - 해당 영역이 없으면 빈 배열 []. 확실하지 않으면 포함하지 마세요(오탐 최소화).

출력 형식(예시):
{"labels":["보도블록","노면 균열"],"pii":[{"kind":"face","x":0.42,"y":0.18,"w":0.12,"h":0.16}]}

설명·마크다운·코드펜스 없이 위 JSON 객체 하나만 출력하세요.`;

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : NaN;
}
function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function cleanLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const v of raw) {
    const s = toStr(v).trim().slice(0, 24);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}

function cleanRegions(raw: unknown): PiiRegion[] {
  if (!Array.isArray(raw)) return [];
  const out: PiiRegion[] = [];
  for (const v of raw) {
    if (!v || typeof v !== "object") continue;
    const r = v as Record<string, unknown>;
    let x = num(r.x),
      y = num(r.y),
      w = num(r.w),
      h = num(r.h);
    if ([x, y, w, h].some(Number.isNaN)) continue;
    x = clamp01(x);
    y = clamp01(y);
    w = clamp01(w);
    h = clamp01(h);
    if (w <= 0.005 || h <= 0.005) continue; // 노이즈 제거
    if (x + w > 1) w = 1 - x;
    if (y + h > 1) h = 1 - y;
    if (w <= 0 || h <= 0) continue;
    const kind = toStr(r.kind).trim().slice(0, 16) || "pii";
    out.push({ x, y, w, h, kind });
    if (out.length >= 12) break;
  }
  return out;
}

/** 코드펜스/설명이 섞여 와도 첫 JSON 객체를 견고하게 추출 */
function extractJson(text: string): unknown | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function analyzeImage(dataUrl: string): Promise<VisionResult> {
  const c = getClient();
  const parsed = parseDataUrl(dataUrl);
  if (!c || !parsed) return EMPTY;

  try {
    const res = await c.messages.create(
      {
        model: MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: parsed.mediaType as
                    | "image/jpeg"
                    | "image/png"
                    | "image/webp"
                    | "image/gif",
                  data: parsed.base64,
                },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      },
      { timeout: 30_000, maxRetries: 1 }
    );

    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return EMPTY;
    const data = extractJson(textBlock.text) as
      | { labels?: unknown; pii?: unknown }
      | null;
    if (!data) return EMPTY;

    return {
      labels: cleanLabels(data.labels),
      piiRegions: cleanRegions(data.pii),
      aiPowered: true,
    };
  } catch {
    // 네트워크/한도/타임아웃 등 — 폴백 경로로 저하
    return EMPTY;
  }
}
