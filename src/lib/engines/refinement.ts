// 데이터 정제 파이프라인
// 1차 자동 평가(GPS 일치·이미지 유무·시각) → 관리자 검수 → 라벨링/마스킹 → 패키징

import { haversine } from "../geo";

export type AssessInput = {
  missionLat: number;
  missionLng: number;
  submissionLat: number;
  submissionLng: number;
  hasPhoto: boolean;
  dataType: string;
};

export type Assessment = {
  qualityScore: number; // 0~100
  gpsMatch: boolean;
  distanceM: number;
  reasons: string[];
};

const GPS_THRESHOLD_M = 45;

/** 제출 데이터 1차 자동 품질 평가 */
export function assessSubmission(input: AssessInput): Assessment {
  const dist = haversine(
    { lat: input.missionLat, lng: input.missionLng },
    { lat: input.submissionLat, lng: input.submissionLng }
  );
  const gpsMatch = dist <= GPS_THRESHOLD_M;
  const reasons: string[] = [];

  let score = 0;

  // 위치 정합성 (최대 45)
  if (gpsMatch) {
    score += 45;
    reasons.push(`위치 일치 (${Math.round(dist)}m)`);
  } else {
    const partial = Math.max(0, 45 - (dist - GPS_THRESHOLD_M) / 4);
    score += partial;
    reasons.push(`위치 오차 ${Math.round(dist)}m`);
  }

  // 콘텐츠 유무 (최대 35)
  const needsPhoto = input.dataType !== "EXPERIENCE";
  if (input.hasPhoto) {
    score += 35;
    reasons.push("이미지 첨부됨");
  } else if (!needsPhoto) {
    score += 30;
    reasons.push("체감 응답 제출");
  } else {
    reasons.push("이미지 없음");
  }

  // 시각 유효성 (최대 20) — 데모에서는 항상 유효
  score += 20;
  reasons.push("촬영 시각 유효");

  return {
    qualityScore: Math.round(Math.min(100, score)),
    gpsMatch,
    distanceM: Math.round(dist),
    reasons,
  };
}

/** AI 자동 라벨링 (데모: 의뢰 유형·우선순위 기반 규칙 라벨) */
export function autoLabel(dataType: string, instruction: string): string[] {
  const labels: string[] = [];
  if (dataType === "IMAGE") labels.push("이미지", "현장촬영");
  if (dataType === "OBSERVATION") labels.push("관찰", "위치기록");
  if (dataType === "EXPERIENCE") labels.push("체감평가", "설문");
  if (/균열|파손|보도블록|노면/.test(instruction)) labels.push("시설물", "안전점검");
  if (/해충|방역/.test(instruction)) labels.push("환경", "방역");
  if (/다리|교량|보행/.test(instruction)) labels.push("보행환경");
  labels.push("위치검증", "시점검증");
  return Array.from(new Set(labels));
}

export const REVIEW = {
  AUTO_APPROVE_THRESHOLD: 80, // 이 이상은 자동 승인 후보
  AUTO_REJECT_THRESHOLD: 35, // 이 미만은 자동 반려 후보
};
