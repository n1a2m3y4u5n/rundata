import fs from "node:fs";
import sharp from "sharp";
const S = "public/samples/vehicle";
const OUT = "/private/tmp/claude-501/-Users-namyunsu-Downloads/a30a36f2-9847-4549-8564-0f886e45aa96/scratchpad/plate-zoom.jpg";
const meta = JSON.parse(fs.readFileSync(`${S}-meta.json`, "utf8"));

const TW = 150, TH = 120, GAP = 4, LBL = 18, COLS = 3;
const cellW = TW * 2 + GAP + 10;
const cellH = TH + LBL + 8;
const rows = Math.ceil(meta.length / COLS);
const W = cellW * COLS, H = cellH * rows;

async function crop(path, r) {
  const img = sharp(path);
  const m = await img.metadata();
  const w = m.width, h = m.height;
  const half = Math.max(r.w, r.h) * 1.6; // 플레이트의 ~3배 영역
  const nx = Math.max(0, r.x + r.w / 2 - half);
  const ny = Math.max(0, r.y + r.h / 2 - half);
  const nw = Math.min(1 - nx, half * 2);
  const nh = Math.min(1 - ny, half * 2);
  return img
    .extract({ left: Math.round(nx * w), top: Math.round(ny * h), width: Math.max(2, Math.round(nw * w)), height: Math.max(2, Math.round(nh * h)) })
    .resize(TW, TH, { fit: "cover" })
    .toBuffer();
}

const svg = [`<rect width="${W}" height="${H}" fill="#111"/>`];
const tiles = [];
for (let i = 0; i < meta.length; i++) {
  const idx = i + 1;
  const r = meta[i].faces?.[0];
  const cx = (i % COLS) * cellW, cy = Math.floor(i / COLS) * cellH;
  svg.push(`<text x="${cx + 4}" y="${cy + 13}" font-family="sans-serif" font-size="12" font-weight="700" fill="#fef08a">v${idx} (원본/마스킹)</text>`);
  if (!r) continue;
  try {
    tiles.push({ input: await crop(`${S}/${idx}.jpg`, r), top: cy + LBL, left: cx });
    tiles.push({ input: await crop(`${S}/${idx}-masked.jpg`, r), top: cy + LBL, left: cx + TW + GAP });
  } catch {}
}
await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } })
  .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), top: 0, left: 0 }, ...tiles])
  .jpeg({ quality: 92 }).toFile(OUT);
console.log("wrote", OUT, `${W}x${H}`);
