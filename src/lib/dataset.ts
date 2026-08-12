// 납품 데이터셋 매니페스트 빌더 (순수 함수 — 시드/서버 공통 사용)

export type DatasetItemInput = {
  id: string;
  runnerName: string;
  lat: number;
  lng: number;
  gpsMatch: boolean;
  distanceM: number;
  qualityScore: number;
  aiLabels: string[];
  capturedAt: string;
  autoReviewed: boolean;
  image: string | null; // 마스킹본 우선
  observation: Record<string, number> | null;
};

export type DatasetRequestInfo = {
  id: string;
  title: string;
  dataType: string;
  areaLat: number;
  areaLng: number;
  areaRadius: number;
  clientName: string;
};

export type DatasetManifest = ReturnType<typeof buildManifest>;

/** 승인 데이터 → 표준 포맷 매니페스트 */
export function buildManifest(
  req: DatasetRequestInfo,
  items: DatasetItemInput[],
  generatedAt: string
) {
  const times = items
    .map((it) => it.capturedAt)
    .filter(Boolean)
    .sort();

  return {
    dataset: `${req.title} 데이터셋`,
    format: "RunData Standard v2",
    generatedAt,
    request: {
      id: req.id,
      title: req.title,
      dataType: req.dataType,
      client: req.clientName,
      area: { lat: req.areaLat, lng: req.areaLng, radiusM: req.areaRadius },
    },
    itemCount: items.length,

    // ── 출처 증빙(provenance) ────────────────────────────────────
    // EU 인공지능법 제53조 제1항 (d)는 범용 AI 모델 제공자에게 학습 콘텐츠의
    // 상세 요약 공개를 의무화했고, 신규 모델은 2025-08-02부터 적용된다.
    // 출처를 증명할 수 없는 데이터는 향후 학습에 쓰기 어려워지므로,
    // 수집 시점부터 출처·동의·비식별 처리 내역을 데이터셋에 동봉한다.
    provenance: {
      collectionMethod:
        "시민참여형 현장 수집 (러너가 지정 지점에서 직접 촬영·응답)",
      collectorConsent:
        "수집자 전원이 플랫폼 이용약관을 통해 데이터 제공 및 재배포에 사전 동의",
      compensation:
        "수집 즉시 기본 크레딧 지급, 납품 확정 후 기여도 기준 성과 보너스 추가 지급",
      geoVerification:
        "각 항목은 미션 지정 좌표와의 실측 거리(gpsDistanceM)로 위치 검증됨",
      temporalRange: times.length
        ? { from: times[0], to: times[times.length - 1] }
        : null,
      deidentification: {
        applied: "얼굴 검출 후 자동 블러, 차량 번호판 영역 마스킹",
        method: "TensorFlow.js BlazeFace + Claude Vision 개인정보 영역 탐지",
        note: "개인정보가 검출되지 않은 이미지는 원본이 유지된다",
        limitation:
          "창문 너머 실내·문패 등 간접 식별 요소는 현재 자동 처리 대상이 아니다",
      },
      thirdPartyContent:
        "웹 크롤링·외부 데이터셋 재사용 없음. 전량 본 플랫폼에서 신규 생성된 원본이다",
      reviewChain:
        "자동 품질검사 → AI 라벨링 → 사람 검수(관리자 승인)의 3단 검증을 거침",
    },

    fields: {
      image: "현장 이미지 경로 (얼굴·번호판·개인텍스트 자동 비식별 처리; 개인정보 미검출 시 원본 유지)",
      lat_lng: "GPS 좌표 (위·경도)",
      gpsVerified: "미션 지점 위치 검증 통과 여부",
      gpsDistanceM: "미션 지점과의 거리(m)",
      qualityScore: "알고리즘 품질 점수 (0~100)",
      labels: "AI 자동 라벨",
      capturedAt: "촬영 시각 (ISO8601)",
      reviewMethod: "auto(알고리즘 자동승인) | manual(관리자 검수)",
    },
    items: items.map((it) => ({
      id: it.id,
      runner: it.runnerName,
      lat: it.lat,
      lng: it.lng,
      gpsVerified: it.gpsMatch,
      gpsDistanceM: it.distanceM,
      qualityScore: it.qualityScore,
      labels: it.aiLabels,
      capturedAt: it.capturedAt,
      reviewMethod: it.autoReviewed ? "auto" : "manual",
      ...(it.image ? { image: it.image } : {}),
      ...(it.observation ? { observation: it.observation } : {}),
    })),
  };
}
