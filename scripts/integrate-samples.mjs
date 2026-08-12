// 워크플로우 _stage/* 결과를 최종 샘플 디렉터리에 통합 (범용).
//  faces-*  → pedestrian (good.json 큐레이션)
//  vehicle-*→ vehicle    (good.json 큐레이션)
//  text-*   → signage    (good.json 큐레이션)
//  인프라 테마(pavement 등) 배치 → 해당 테마 (전체)
import fs from "node:fs";
import path from "node:path";
const S = "public/samples";
const stage = `${S}/_stage`;

function currentMax(dir) {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => /^\d+\.jpg$/.test(f)).map((f) => parseInt(f)).reduce((a, b) => Math.max(a, b), 0);
}
function copyPair(srcDir, srcIdx, dstDir, dstIdx) {
  fs.mkdirSync(dstDir, { recursive: true });
  fs.copyFileSync(path.join(srcDir, `${srcIdx}.jpg`), path.join(dstDir, `${dstIdx}.jpg`));
  const sm = path.join(srcDir, `${srcIdx}-masked.jpg`);
  fs.copyFileSync(fs.existsSync(sm) ? sm : path.join(srcDir, `${srcIdx}.jpg`), path.join(dstDir, `${dstIdx}-masked.jpg`));
}

// prefix 배치들의 good(없으면 전체)만 theme 디렉터리에 이어붙이고 메타 갱신
function appendCurated(prefix, theme) {
  const dstDir = `${S}/${theme}`;
  const metaPath = `${S}/${theme}-meta.json`;
  const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : [];
  let n = currentMax(dstDir), added = 0;
  const batches = fs.existsSync(stage) ? fs.readdirSync(stage).filter((d) => d.startsWith(prefix)).sort() : [];
  for (const b of batches) {
    const dir = `${stage}/${b}`;
    if (!fs.existsSync(`${dir}/meta.json`)) continue;
    const m = JSON.parse(fs.readFileSync(`${dir}/meta.json`, "utf8"));
    // good.json 없는 배치(에이전트 실패 등)는 미큐레이션 → 제외
    const good = fs.existsSync(`${dir}/good.json`)
      ? JSON.parse(fs.readFileSync(`${dir}/good.json`, "utf8"))
      : [];
    for (const idx of good) {
      if (!fs.existsSync(`${dir}/${idx}.jpg`)) continue;
      n++; copyPair(dir, idx, dstDir, n);
      const e = m.find((x) => x.idx === idx) || {};
      meta.push({ labels: e.labels ?? [], faceCount: e.faceCount ?? 1, faces: e.faces ?? [] });
      added++;
    }
  }
  fs.mkdirSync(dstDir, { recursive: true });
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  return { added, total: n };
}

const counts = {};
for (const [prefix, theme] of [["faces-", "pedestrian"], ["vehicle-", "vehicle"], ["text-", "signage"]]) {
  const r = appendCurated(prefix, theme);
  counts[theme] = r.total;
  console.log(`ADDED_${theme}=${r.added}`);
}

// 인프라 테마 배치(있으면 전체 통합)
for (const t of ["pavement", "crack", "sign", "street", "river", "facility"]) {
  const src = `${stage}/${t}`;
  if (!fs.existsSync(src)) continue;
  const dst = `${S}/${t}`;
  let n = currentMax(dst);
  for (const idx of fs.readdirSync(src).filter((f) => /^\d+\.jpg$/.test(f)).map((f) => parseInt(f)).sort((a, b) => a - b)) { n++; copyPair(src, idx, dst, n); }
  counts[t] = n;
}

console.log("COUNTS=" + JSON.stringify(counts));
fs.rmSync(stage, { recursive: true, force: true });
console.log("staging cleaned");
