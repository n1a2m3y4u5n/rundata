// 샘플 확장 배치 워커 (병렬 실행용). 각 배치는 고유 outDir에 기록해 충돌 없음.
//  faces 모드: 보행자/러너 사진 → BlazeFace 얼굴탐지(신뢰도 필터) → 블러 비식별화 + Claude 라벨
//  infra 모드: 인프라 사진 → 원본 + clean copy(-masked) (개인정보 없음)
// 사용: node scripts/expand-batch.mjs '<json-config>'
//   config: { mode, name, tags:[...], need, startLock, outDir }
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import Anthropic from "@anthropic-ai/sdk";

const cfg = JSON.parse(process.argv[2]);
const { mode, tags, need, startLock, outDir } = cfg;
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.VISION_MODEL || "claude-opus-4-8";

async function fetchImage(tag, lock) {
  const res = await fetch(`https://loremflickr.com/640/480/${encodeURIComponent(tag)}?lock=${lock}`, { redirect: "follow" });
  if (!res.ok) return null;
  if (!(res.headers.get("content-type") || "").startsWith("image/")) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length < 4000 ? null : buf;
}

async function labelImage(buf) {
  try {
    const res = await client.messages.create({
      model: MODEL, max_tokens: 256,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") } },
        { type: "text", text: `이 현장 사진 내용을 설명하는 한국어 태그 3~6개를 JSON으로만. 도로/보도/시설/환경/교통 관점 짧은 명사구. 형식:{"labels":["보행자","보도"]}` },
      ] }],
    }, { timeout: 30000, maxRetries: 1 });
    const t = res.content.find((b) => b.type === "text")?.text ?? "";
    const data = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
    const out = [];
    for (const v of data.labels ?? []) { const s = String(v ?? "").trim().slice(0, 24); if (s && !out.includes(s)) out.push(s); if (out.length >= 6) break; }
    return out;
  } catch { return []; }
}

// ---- infra: 다운로드 + clean copy ----
async function runInfra() {
  const kept = [];
  const seen = new Set();
  let attempts = 0, lock = startLock;
  while (kept.length < need && attempts < need * 5) {
    const tag = tags[attempts % tags.length];
    attempts++;
    let buf; try { buf = await fetchImage(tag, lock++); } catch { buf = null; }
    if (!buf) continue;
    let jpg; try { jpg = await sharp(buf).jpeg({ quality: 85 }).toBuffer(); } catch { continue; }
    const hash = crypto.createHash("md5").update(jpg).digest("hex");
    if (seen.has(hash)) continue; seen.add(hash);
    const n = kept.length + 1;
    fs.writeFileSync(path.join(outDir, `${n}.jpg`), jpg);
    fs.writeFileSync(path.join(outDir, `${n}-masked.jpg`), jpg); // 개인정보 없음 → 원본 유지
    kept.push({ idx: n });
  }
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(kept, null, 2));
  console.log(JSON.stringify({ mode, kept: kept.length, outDir }));
}

// ---- faces: BlazeFace 탐지 + 블러 ----
function toPixelRect(r, w, h) {
  const cx = (r.x + r.w / 2) * w, cy = (r.y + r.h / 2) * h;
  const bw = Math.min(w, Math.max(r.w * w * 1.3, w * 0.06));
  const bh = Math.min(h, Math.max(r.h * h * 1.3, h * 0.06));
  let x = Math.round(cx - bw / 2), y = Math.round(cy - bh / 2);
  x = Math.max(0, Math.min(w - Math.round(bw), x)); y = Math.max(0, Math.min(h - Math.round(bh), y));
  return { x, y, w: Math.round(bw), h: Math.round(bh) };
}
function badge(b) {
  const border = `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="6" fill="none" stroke="#34d399" stroke-width="2" opacity="0.9"/>`;
  const chip = b.w >= 54 && b.h >= 22 ? `<rect x="${b.x + 4}" y="${b.y + 4}" width="26" height="18" rx="4" fill="#0b1512" opacity="0.7"/><text x="${b.x + 9}" y="${b.y + 17}" font-size="12" fill="#34d399">🔒</text>` : "";
  return border + chip;
}
async function runFaces() {
  await tf.setBackend("cpu"); await tf.ready();
  const model = await blazeface.load();
  async function detect(buf) {
    const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const input = tf.tensor3d(new Uint8Array(data), [h, w, 3]);
    let preds; try { preds = await model.estimateFaces(input, false); } finally { input.dispose(); }
    const out = [];
    for (const p of preds) {
      const prob = Array.isArray(p.probability) ? p.probability[0] : p.probability;
      const [x1, y1] = p.topLeft, [x2, y2] = p.bottomRight;
      const nw = (x2 - x1) / w, nh = (y2 - y1) / h, area = nw * nh;
      // 생성용은 다소 느슨하게(실제 얼굴 최대한 포집) — 오탐/부적절은 이후 시각 큐레이션에서 제거
      if (prob < 0.9 || area < 0.01 || nw > 0.5 || nh > 0.6) continue;
      out.push({ x: Math.max(0, x1 / w), y: Math.max(0, y1 / h), w: nw, h: nh, kind: "face" });
    }
    return out;
  }
  async function blur(buf, regions) {
    const img = sharp(buf); const m = await img.metadata(); const w = m.width, h = m.height;
    const rects = regions.map((r) => toPixelRect(r, w, h)).filter((b) => b.w >= 1 && b.h >= 1);
    const comp = [];
    for (const b of rects) {
      const sigma = Math.min(45, Math.max(14, Math.round(Math.min(b.w, b.h) / 2.8)));
      comp.push({ input: await sharp(buf).extract({ left: b.x, top: b.y, width: b.w, height: b.h }).blur(sigma).toBuffer(), left: b.x, top: b.y });
    }
    comp.push({ input: Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${rects.map(badge).join("")}</svg>`), top: 0, left: 0 });
    return sharp(buf).composite(comp).jpeg({ quality: 85 }).toBuffer();
  }
  const kept = [];
  const seen = new Set();
  let attempts = 0, lock = startLock;
  while (kept.length < need && attempts < need * 22) {
    const tag = tags[attempts % tags.length];
    attempts++;
    let buf; try { buf = await fetchImage(tag, lock++); } catch { buf = null; }
    if (!buf) continue;
    let jpg; try { jpg = await sharp(buf).jpeg({ quality: 85 }).toBuffer(); } catch { continue; }
    const hash = crypto.createHash("md5").update(jpg).digest("hex");
    if (seen.has(hash)) continue; seen.add(hash);
    let faces; try { faces = await detect(jpg); } catch { faces = []; }
    if (faces.length < 1 || faces.length > 3) continue;
    const labels = await labelImage(jpg);
    const n = kept.length + 1;
    fs.writeFileSync(path.join(outDir, `${n}.jpg`), jpg);
    fs.writeFileSync(path.join(outDir, `${n}-masked.jpg`), await blur(jpg, faces));
    kept.push({ idx: n, labels, faceCount: faces.length, faces });
  }
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(kept, null, 2));
  console.log(JSON.stringify({ mode, kept: kept.length, outDir }));
}

// ---- vehicle(번호판) / text(개인 텍스트) : Claude 탐지 + 블러 ----
const DETECT_PROMPT = {
  vehicle: `이 차량 현장 사진을 분석해 JSON만 출력하라.
(1) labels: 한국어 태그 3~5개 (예 "차량","도로","주차장","트럭").
(2) regions: 차량 번호판(license plate) 영역의 정규화(0~1) bbox. x,y=좌상단, w,h=너비/높이. 번호판은 작으니 타이트하게. 없으면 [].
형식:{"labels":["차량","도로"],"regions":[{"x":0.41,"y":0.62,"w":0.08,"h":0.03}]}  설명 없이 JSON 하나만.`,
  text: `이 사진에서 개인을 식별하는 텍스트 영역만 찾아라(사람 이름·주소·전화번호·현관 명패·우편함 이름표·작업자 명찰·택배 송장). 상점 브랜드명·일반 안내문·교통표지는 제외.
(1) labels: 한국어 태그 3~5개 (예 "우편함","현관 명패","주소판","명찰").
(2) regions: 해당 개인정보 텍스트의 정규화(0~1) bbox. x,y=좌상단, w,h=너비/높이. 없으면 [].
형식:{"labels":["우편함","주소판"],"regions":[{"x":0.3,"y":0.4,"w":0.2,"h":0.08}]}  설명 없이 JSON 하나만.`,
};
async function claudeDetect(buf, kind) {
  const res = await client.messages.create({
    model: MODEL, max_tokens: 400,
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") } },
      { type: "text", text: DETECT_PROMPT[kind] },
    ] }],
  }, { timeout: 30000, maxRetries: 1 });
  const t = res.content.find((b) => b.type === "text")?.text ?? "";
  let d; try { d = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch { d = {}; }
  const labels = [];
  for (const v of d.labels ?? []) { const s = String(v ?? "").trim().slice(0, 24); if (s && !labels.includes(s)) labels.push(s); if (labels.length >= 6) break; }
  const regions = [];
  for (const p of d.regions ?? []) {
    let { x, y, w, h } = p;
    if (![x, y, w, h].every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    x = Math.max(0, Math.min(1, x)); y = Math.max(0, Math.min(1, y)); w = Math.max(0, Math.min(1, w)); h = Math.max(0, Math.min(1, h));
    if (w <= 0.004 || h <= 0.004) continue;
    if (w > 0.9 && h > 0.85) continue;
    if (x + w > 1) w = 1 - x; if (y + h > 1) h = 1 - y;
    regions.push({ x, y, w, h, kind });
    if (regions.length >= 6) break;
  }
  return { labels, regions };
}
function detRect(r, w, h) {
  const cx = (r.x + r.w / 2) * w, cy = (r.y + r.h / 2) * h;
  const bw = Math.min(w, Math.max(r.w * w * 1.5, w * 0.06));
  const bh = Math.min(h, Math.max(r.h * h * 1.5, h * 0.04));
  let x = Math.round(cx - bw / 2), y = Math.round(cy - bh / 2);
  x = Math.max(0, Math.min(w - Math.round(bw), x)); y = Math.max(0, Math.min(h - Math.round(bh), y));
  return { x, y, w: Math.round(bw), h: Math.round(bh) };
}
async function detBlur(buf, regions) {
  const img = sharp(buf); const m = await img.metadata(); const w = m.width, h = m.height;
  const rects = regions.map((r) => detRect(r, w, h)).filter((b) => b.w >= 1 && b.h >= 1);
  const comp = [];
  for (const b of rects) {
    const sigma = Math.min(35, Math.max(9, Math.round(Math.min(b.w, b.h) / 2.2)));
    comp.push({ input: await sharp(buf).extract({ left: b.x, top: b.y, width: b.w, height: b.h }).blur(sigma).toBuffer(), left: b.x, top: b.y });
  }
  comp.push({ input: Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${rects.map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="none" stroke="#34d399" stroke-width="2" opacity="0.9"/>`).join("")}</svg>`), top: 0, left: 0 });
  return sharp(buf).composite(comp).jpeg({ quality: 85 }).toBuffer();
}
async function runDetect(kind) {
  const kept = [], seen = new Set();
  let attempts = 0, lock = startLock;
  while (kept.length < need && attempts < need * 12) {
    const tag = tags[attempts % tags.length];
    attempts++;
    let buf; try { buf = await fetchImage(tag, lock++); } catch { buf = null; }
    if (!buf) continue;
    let jpg; try { jpg = await sharp(buf).jpeg({ quality: 85 }).toBuffer(); } catch { continue; }
    const hash = crypto.createHash("md5").update(jpg).digest("hex");
    if (seen.has(hash)) continue; seen.add(hash);
    let a; try { a = await claudeDetect(jpg, kind); } catch { continue; }
    if (a.regions.length < 1) continue;
    const n = kept.length + 1;
    fs.writeFileSync(path.join(outDir, `${n}.jpg`), jpg);
    fs.writeFileSync(path.join(outDir, `${n}-masked.jpg`), await detBlur(jpg, a.regions));
    kept.push({ idx: n, labels: a.labels, faceCount: a.regions.length, faces: a.regions });
  }
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(kept, null, 2));
  console.log(JSON.stringify({ mode, kept: kept.length, outDir }));
}

if (mode === "infra") await runInfra();
else if (mode === "vehicle") await runDetect("vehicle");
else if (mode === "text") await runDetect("text");
else await runFaces();
