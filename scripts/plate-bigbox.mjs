import fs from "node:fs";
import sharp from "sharp";
const S = "public/samples/vehicle";
const OUT = "/private/tmp/claude-501/-Users-namyunsu-Downloads/a30a36f2-9847-4549-8564-0f886e45aa96/scratchpad/plate-bigbox.jpg";
const meta = JSON.parse(fs.readFileSync(`${S}-meta.json`, "utf8"));
const PICK = [9, 13, 15, 18];

// 넉넉한 박스: 탐지 중심 기준, 최소 폭 20% · 높이 15%, 탐지크기의 2.4배
function bigRect(r, w, h) {
  const cx = (r.x + r.w / 2) * w, cy = (r.y + r.h / 2) * h;
  const bw = Math.min(w, Math.max(r.w * w * 2.4, w * 0.20));
  const bh = Math.min(h, Math.max(r.h * h * 2.4, h * 0.15));
  let x = Math.round(cx - bw / 2), y = Math.round(cy - bh / 2);
  x = Math.max(0, Math.min(w - Math.round(bw), x)); y = Math.max(0, Math.min(h - Math.round(bh), y));
  return { x, y, w: Math.round(bw), h: Math.round(bh) };
}
async function render(idx) {
  const r = meta[idx - 1].faces[0];
  const buf = fs.readFileSync(`${S}/${idx}.jpg`);
  const m = await sharp(buf).metadata();
  const b = bigRect(r, m.width, m.height);
  const blurred = await sharp(buf).extract({ left: b.x, top: b.y, width: b.w, height: b.h }).blur(Math.max(14, Math.round(Math.min(b.w, b.h) / 3))).toBuffer();
  const border = Buffer.from(`<svg width="${m.width}" height="${m.height}" xmlns="http://www.w3.org/2000/svg"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="4" fill="none" stroke="#34d399" stroke-width="3" opacity="0.9"/></svg>`);
  return sharp(buf).composite([{ input: blurred, left: b.x, top: b.y }, { input: border, top: 0, left: 0 }]).jpeg({ quality: 90 }).toBuffer();
}
const TW = 300, TH = 225, GAP = 6, LBL = 20;
const cellH = TH + LBL + 6, W = TW * 2 + GAP + 12, H = cellH * PICK.length;
const svg = [`<rect width="${W}" height="${H}" fill="#111"/>`];
const tiles = [];
for (let i = 0; i < PICK.length; i++) {
  const idx = PICK[i], y = i * cellH;
  svg.push(`<text x="6" y="${y + 14}" font-family="sans-serif" font-size="13" font-weight="700" fill="#fef08a">v${idx} — 원본(좌) / 넉넉한박스 마스킹(우)</text>`);
  tiles.push({ input: await sharp(`${S}/${idx}.jpg`).resize(TW, TH, { fit: "cover" }).toBuffer(), top: y + LBL, left: 0 });
  tiles.push({ input: await sharp(await render(idx)).resize(TW, TH, { fit: "cover" }).toBuffer(), top: y + LBL, left: TW + GAP });
}
await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } })
  .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), top: 0, left: 0 }, ...tiles])
  .jpeg({ quality: 92 }).toFile(OUT);
console.log("wrote", OUT);
