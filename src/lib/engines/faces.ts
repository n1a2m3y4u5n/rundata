import "server-only";
import sharp from "sharp";
import type { PiiRegion } from "./vision";

/**
 * 전용 얼굴탐지(BlazeFace, TensorFlow.js) 기반 정밀 얼굴 bbox 탐지.
 * 범용 비전모델(Claude)의 근사 bbox보다 얼굴 위치를 픽셀 단위로 정확히 잡는다.
 * tfjs/blazeface는 동적 import + 싱글턴 캐시. 로드/추론 실패 시 [] 반환(폴백).
 * 인프라 텍스처 오탐을 줄이기 위해 신뢰도·크기·종횡비를 엄격히 필터링한다.
 */

type Loaded = {
  tf: typeof import("@tensorflow/tfjs");
  model: Awaited<
    ReturnType<typeof import("@tensorflow-models/blazeface").load>
  >;
};

let loadPromise: Promise<Loaded | null> | null = null;
async function getModel(): Promise<Loaded | null> {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.setBackend("cpu");
        await tf.ready();
        const blazeface = await import("@tensorflow-models/blazeface");
        const model = await blazeface.load();
        return { tf, model };
      } catch {
        return null;
      }
    })();
  }
  return loadPromise;
}

/** 서버 시작 후 첫 제출 지연을 줄이기 위한 사전 로드(선택). */
export function warmFaceModel(): void {
  void getModel();
}

export async function detectFaces(dataUrl: string): Promise<PiiRegion[]> {
  try {
    const base64 = dataUrl.split(",")[1];
    if (!base64) return [];
    const loaded = await getModel();
    if (!loaded) return [];
    const { tf, model } = loaded;

    const buf = Buffer.from(base64, "base64");
    const { data, info } = await sharp(buf)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const w = info.width;
    const h = info.height;

    const input = tf.tensor3d(new Uint8Array(data), [h, w, 3]);
    let preds: Awaited<ReturnType<typeof model.estimateFaces>>;
    try {
      preds = await model.estimateFaces(input, false);
    } finally {
      input.dispose();
    }

    const out: PiiRegion[] = [];
    for (const p of preds) {
      const probRaw = p.probability as number | number[] | undefined;
      const prob = Array.isArray(probRaw) ? probRaw[0] : probRaw ?? 1;
      const [x1, y1] = p.topLeft as [number, number];
      const [x2, y2] = p.bottomRight as [number, number];
      const nw = (x2 - x1) / w;
      const nh = (y2 - y1) / h;
      const area = nw * nh;
      const aspect = nh > 0 ? nw / nh : 0;
      // 오탐 억제: 높은 신뢰도 + 합리적 크기 + 얼굴다운 종횡비
      if (prob < 0.92) continue;
      if (area < 0.01 || area > 0.35) continue;
      if (nw > 0.45 || nh > 0.5) continue;
      if (aspect < 0.55 || aspect > 1.6) continue;
      out.push({
        x: Math.max(0, x1 / w),
        y: Math.max(0, y1 / h),
        w: nw,
        h: nh,
        kind: "face",
      });
      if (out.length >= 12) break;
    }
    return out;
  } catch {
    return [];
  }
}
