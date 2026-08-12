import "server-only";
import sharp from "sharp";
import type { PiiRegion } from "./vision";

/**
 * 개인정보 비식별화 — 탐지된 영역(얼굴 등)에 가우시안 블러를 적용한다.
 * 까만 리댁션과 달리 얼굴은 식별 불가능하게 하면서 사람·자세·장면 구조는 보존해
 * 데이터 훼손을 최소화한다(구글 스트리트뷰 등 업계 표준 방식).
 *  - regions 미지정(undefined): AI 미분석 → 폴백 고정영역 블러(데모 저하 경로)
 *  - regions === []          : 개인정보 미검출 → 원본 유지(처리 불필요)
 *  - regions 존재            : 각 영역을 블러 처리 + 처리 표식(테두리·자물쇠)
 */
export async function maskImage(
  dataUrl: string,
  regions?: PiiRegion[]
): Promise<string> {
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return dataUrl;
    const input = Buffer.from(base64, "base64");
    const meta = await sharp(input).metadata();
    const w = meta.width ?? 640;
    const h = meta.height ?? 480;

    // 분석 완료 & 개인정보 없음 → 원본 유지
    if (regions && regions.length === 0) return dataUrl;

    const rects = (regions ? regions.map((r) => toPixelRect(r, w, h)) : fallbackRects(w, h)).filter(
      (b) => b.w >= 1 && b.h >= 1
    );
    if (rects.length === 0) return dataUrl;

    const composites: sharp.OverlayOptions[] = [];
    // 1) 각 영역을 잘라 강한 블러 후 원위치에 합성 (해당 영역만 비식별화)
    for (const b of rects) {
      const sigma = Math.min(45, Math.max(14, Math.round(Math.min(b.w, b.h) / 2.8)));
      const blurred = await sharp(input)
        .extract({ left: b.x, top: b.y, width: b.w, height: b.h })
        .blur(sigma)
        .toBuffer();
      composites.push({ input: blurred, left: b.x, top: b.y });
    }
    // 2) 처리 표식(녹색 테두리 + 자물쇠 배지) — 의도된 개인정보 처리임을 표시
    const overlay = Buffer.from(
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${rects
        .map((b) => badge(b))
        .join("")}</svg>`
    );
    composites.push({ input: overlay, top: 0, left: 0 });

    const out = await sharp(input)
      .composite(composites)
      .jpeg({ quality: 85 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString("base64")}`;
  } catch {
    return dataUrl; // 실패 시 원본 유지
  }
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * 정규화 bbox → 픽셀 사각형. 중심 유지 + 30% 패딩 + 최소 6% floor
 * (부정확한 bbox도 대상을 덮도록 약간 넉넉히).
 */
function toPixelRect(r: PiiRegion, w: number, h: number): Rect {
  const cx = (r.x + r.w / 2) * w;
  const cy = (r.y + r.h / 2) * h;
  const bw = Math.min(w, Math.max(r.w * w * 1.3, w * 0.06));
  const bh = Math.min(h, Math.max(r.h * h * 1.3, h * 0.06));
  let x = Math.round(cx - bw / 2);
  let y = Math.round(cy - bh / 2);
  x = Math.max(0, Math.min(w - Math.round(bw), x));
  y = Math.max(0, Math.min(h - Math.round(bh), y));
  return { x, y, w: Math.round(bw), h: Math.round(bh) };
}

/** 처리 표식: 녹색 테두리 + 좌상단 자물쇠 배지 */
function badge(b: Rect): string {
  const border = `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="none" stroke="#34d399" stroke-width="2" opacity="0.9"/>`;
  const chip =
    b.w >= 54 && b.h >= 22
      ? `<rect x="${b.x + 4}" y="${b.y + 4}" width="26" height="18" rx="4" fill="#0b1512" opacity="0.7"/><text x="${b.x + 9}" y="${b.y + 17}" font-family="sans-serif" font-size="12" fill="#34d399">🔒</text>`
      : "";
  return border + chip;
}

/** AI 미분석 시 폴백(사람/번호판이 있을 법한 영역 가정) */
function fallbackRects(w: number, h: number): Rect[] {
  const boxW = Math.round(w * 0.28);
  const boxH = Math.round(h * 0.12);
  return [
    { x: Math.round(w * 0.12), y: Math.round(h * 0.42), w: boxW, h: boxH },
    {
      x: Math.round(w * 0.58),
      y: Math.round(h * 0.6),
      w: Math.round(boxW * 0.7),
      h: Math.round(boxH * 0.8),
    },
  ];
}
