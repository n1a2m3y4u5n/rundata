import fs from "node:fs";
import sharp from "sharp";
const S = "public/samples/signage";
const OUT = "/private/tmp/claude-501/-Users-namyunsu-Downloads/a30a36f2-9847-4549-8564-0f886e45aa96/scratchpad/plate-zoom2.jpg";
const meta = JSON.parse(fs.readFileSync(`${S}-meta.json`, "utf8"));
const PICK = [1,2,3,4,5,6,7,8,9];
const TW = 280, TH = 200, GAP = 6, LBL = 22;
const cellH = TH + LBL + 8;
const W = TW * 2 + GAP + 12, H = cellH * PICK.length;

async function crop(path, r) {
  const img = sharp(path);
  const m = await img.metadata();
  const w = m.width, h = m.height;
  const half = Math.max(r.w, r.h) * 1.4;
  const nx = Math.max(0, r.x + r.w / 2 - half), ny = Math.max(0, r.y + r.h / 2 - half);
  const nw = Math.min(1 - nx, half * 2), nh = Math.min(1 - ny, half * 2);
  return img.extract({ left: Math.round(nx * w), top: Math.round(ny * h), width: Math.max(2, Math.round(nw * w)), height: Math.max(2, Math.round(nh * h)) }).resize(TW, TH, { fit: "cover" }).toBuffer();
}
const svg = [`<rect width="${W}" height="${H}" fill="#111"/>`];
const tiles = [];
for (let i = 0; i < PICK.length; i++) {
  const idx = PICK[i], r = meta[idx - 1].faces?.[0], y = i * cellH;
  svg.push(`<text x="6" y="${y + 15}" font-family="sans-serif" font-size="14" font-weight="700" fill="#fef08a">s${idx}  —  원본(좌) / 마스킹(우) · ${meta[idx - 1].labels.slice(0, 2).join("·")}</text>`);
  tiles.push({ input: await crop(`${S}/${idx}.jpg`, r), top: y + LBL, left: 0 });
  tiles.push({ input: await crop(`${S}/${idx}-masked.jpg`, r), top: y + LBL, left: TW + GAP });
}
await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } })
  .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), top: 0, left: 0 }, ...tiles])
  .jpeg({ quality: 92 }).toFile(OUT);
console.log("wrote", OUT);
