// 서버 시작 시 BlazeFace 얼굴탐지 모델을 미리 로드해 첫 제출 지연을 줄인다.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { warmFaceModel } = await import("@/lib/engines/faces");
      warmFaceModel();
    } catch {
      // 실패해도 런타임에서 지연 로드되므로 무시
    }
  }
}
