import fs from "node:fs";
import sharp from "sharp";

const S = "public/samples";
const OUT = "/private/tmp/claude-501/-Users-namyunsu-Downloads/a30a36f2-9847-4549-8564-0f886e45aa96/scratchpad/masking-demo.jpg";

const SECTIONS = [
  { n: "①", title: "얼굴 (보행자·러너)", engine: "BlazeFace 전용 얼굴탐지", color: "#2563eb", pairs: ["pedestrian/2", "pedestrian/8"] },
  { n: "②", title: "개인 식별 텍스트 (이름·명패)", engine: "Claude Vision 탐지", color: "#d97706", pairs: ["signage/7", "signage/4"] },
];

const W = 1000, TW = 200, TH = 150;
const M = 40;
const secH = 28 + 22 + TH + 22;
const top = 96;
const H = top + SECTIONS.length * secH + 20;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svgParts = [
  `<rect x="0" y="0" width="${W}" height="${H}" fill="#f8fafc"/>`,
  `<text x="${M}" y="42" font-family="sans-serif" font-size="27" font-weight="800" fill="#0f172a">RunData · 개인정보 자동 비식별화</text>`,
  `<text x="${M}" y="70" font-family="sans-serif" font-size="14" fill="#64748b">처리 전 → 처리 후 · 얼굴은 BlazeFace, 개인 텍스트는 Claude Vision으로 탐지 → 해당 영역만 가우시안 블러(sharp)로 비식별화</text>`,
];
const composites = [];

for (let s = 0; s < SECTIONS.length; s++) {
  const sec = SECTIONS[s];
  const y0 = top + s * secH;
  // 섹션 헤더
  svgParts.push(`<rect x="${M}" y="${y0}" width="${W - 2 * M}" height="28" rx="6" fill="${sec.color}"/>`);
  svgParts.push(`<text x="${M + 12}" y="${y0 + 19}" font-family="sans-serif" font-size="15" font-weight="700" fill="#ffffff">${sec.n}  ${esc(sec.title)}</text>`);
  svgParts.push(`<text x="${W - M - 12}" y="${y0 + 19}" text-anchor="end" font-family="sans-serif" font-size="13" font-weight="600" fill="#ffffff" opacity="0.92">${esc(sec.engine)}</text>`);

  const rowY = y0 + 28 + 22;
  for (let p = 0; p < sec.pairs.length; p++) {
    const base = sec.pairs[p];
    const px = M + p * (2 * TW + 40 + 36); // 쌍1 x=40, 쌍2 x=516
    const origX = px, maskX = px + TW + 40;
    // 라벨
    svgParts.push(`<text x="${origX + TW / 2}" y="${rowY - 6}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="#475569">처리 전</text>`);
    svgParts.push(`<text x="${maskX + TW / 2}" y="${rowY - 6}" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="700" fill="${sec.color}">처리 후</text>`);
    // 화살표
    const ay = rowY + TH / 2;
    const axc = origX + TW + 20;
    svgParts.push(`<line x1="${origX + TW + 6}" y1="${ay}" x2="${origX + TW + 32}" y2="${ay}" stroke="#94a3b8" stroke-width="3"/><path d="M ${origX + TW + 32} ${ay} l -8 -5 l 0 10 z" fill="#94a3b8"/>`);
    void axc;
    // 이미지 테두리
    svgParts.push(`<rect x="${origX - 1}" y="${rowY - 1}" width="${TW + 2}" height="${TH + 2}" rx="5" fill="none" stroke="#cbd5e1" stroke-width="1.5"/>`);
    svgParts.push(`<rect x="${maskX - 1}" y="${rowY - 1}" width="${TW + 2}" height="${TH + 2}" rx="5" fill="none" stroke="${sec.color}" stroke-width="2"/>`);
    composites.push({ base, origX, maskX, rowY });
  }
}

const overlay = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgParts.join("")}</svg>`);

const layers = [{ input: overlay, top: 0, left: 0 }];
for (const c of composites) {
  const orig = await sharp(`${S}/${c.base}.jpg`).resize(TW, TH, { fit: "cover" }).png().toBuffer();
  const mask = await sharp(`${S}/${c.base}-masked.jpg`).resize(TW, TH, { fit: "cover" }).png().toBuffer();
  layers.push({ input: orig, left: c.origX, top: c.rowY });
  layers.push({ input: mask, left: c.maskX, top: c.rowY });
}

await sharp({ create: { width: W, height: H, channels: 3, background: "#f8fafc" } })
  .composite(layers)
  .jpeg({ quality: 92 })
  .toFile(OUT);
console.log("wrote", OUT, `(${W}x${H})`);
