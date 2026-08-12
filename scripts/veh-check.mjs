import fs from "node:fs";
import sharp from "sharp";
const S = "public/samples/vehicle";
const OUT = "/private/tmp/claude-501/-Users-namyunsu-Downloads/a30a36f2-9847-4549-8564-0f886e45aa96/scratchpad/veh-check.jpg";
const n = JSON.parse(fs.readFileSync(`${S}-meta.json`, "utf8")).length;
const CW = 300, CH = 225, GAP = 6, LBL = 24;
const rowH = CH + LBL + GAP;
const tiles = [];
const svg = [`<rect width="${CW * 2 + GAP}" height="${rowH * n}" fill="#111"/>`];
for (let i = 1; i <= n; i++) {
  const y = (i - 1) * rowH;
  svg.push(`<text x="6" y="${y + 17}" font-family="sans-serif" font-size="15" font-weight="700" fill="#fef08a">vehicle/${i}  —  원본(좌) / 마스킹(우)</text>`);
  tiles.push({ input: await sharp(`${S}/${i}.jpg`).resize(CW, CH, { fit: "cover" }).toBuffer(), top: y + LBL, left: 0 });
  tiles.push({ input: await sharp(`${S}/${i}-masked.jpg`).resize(CW, CH, { fit: "cover" }).toBuffer(), top: y + LBL, left: CW + GAP });
}
await sharp({ create: { width: CW * 2 + GAP, height: rowH * n, channels: 3, background: "#111" } })
  .composite([{ input: Buffer.from(`<svg width="${CW * 2 + GAP}" height="${rowH * n}" xmlns="http://www.w3.org/2000/svg">${svg.join("")}</svg>`), top: 0, left: 0 }, ...tiles])
  .jpeg({ quality: 90 }).toFile(OUT);
console.log("wrote", OUT, n, "vehicles");
