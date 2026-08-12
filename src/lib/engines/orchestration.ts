// 미션 오케스트레이션 엔진
// 의뢰(Request)를 러너가 수행할 개별 미션(Mission) 집합으로 변환한다.
// 본 플랫폼의 핵심 기술: "어떤 의뢰든 러너 미션으로 변환하는 능력".

import { pointInCircle, type LatLng } from "../geo";
import { DATA_TYPE, type DataType } from "../constants";

/** 한 의뢰가 생성할 수 있는 최대 미션 수 (선입금·완료판정과 일관성 유지) */
export const MAX_MISSIONS_PER_REQUEST = 60;

export type MissionSpec = {
  lat: number;
  lng: number;
  instruction: string;
  dataType: DataType;
  priority: number; // 1~5
  reward: number;
};

export type OrchestrateInput = {
  title: string;
  dataType: DataType;
  center: LatLng;
  radiusM: number;
  targetCount: number;
  rewardPerItem: number;
  seed?: number;
  /**
   * 의뢰가 특정 지시문을 지정한 경우(공공 안전 프리셋 등) 이 문구를 그대로 쓴다.
   * 지정하지 않으면 데이터 유형별 기본 템플릿을 순환한다.
   */
  instruction?: string;
};

const INSTRUCTION: Record<DataType, string[]> = {
  IMAGE: [
    "지정 대상을 정면에서 1장 촬영해 주세요",
    "지면·하단부가 보이도록 촬영해 주세요",
    "파손·이상이 보이면 가까이에서 한 장 더 촬영해 주세요",
    "전체가 프레임에 들어오도록 촬영해 주세요",
  ],
  OBSERVATION: [
    "이 구역에서 이상 지점을 발견하면 사진과 위치를 기록해 주세요",
    "해당 지점의 현재 상태를 관찰해 기록해 주세요",
    "주변을 둘러보고 특이사항을 촬영해 주세요",
  ],
  EXPERIENCE: [
    "직접 통과·체험 후 3개 항목을 척도로 보고해 주세요",
    "체감 요소를 정해진 척도에 따라 평가해 주세요",
    "이용 적합성을 직접 확인 후 보고해 주세요",
  ],
};

/**
 * 의뢰를 미션 포인트 집합으로 변환.
 * - 대상 지역 원 내부에 결정적(재현 가능) 분포로 포인트 생성
 * - 중심에 가까울수록, 시드 패턴에 따라 우선순위 가중
 */
export function orchestrate(input: OrchestrateInput): MissionSpec[] {
  const {
    title,
    dataType,
    center,
    radiusM,
    targetCount,
    rewardPerItem,
    seed = hashSeed(title),
    instruction,
  } = input;

  // 데모 안정성을 위해 시각화 포인트 수 상한
  const count = Math.max(1, Math.min(targetCount, MAX_MISSIONS_PER_REQUEST));
  const templates = INSTRUCTION[dataType] ?? INSTRUCTION.IMAGE;
  const missions: MissionSpec[] = [];

  for (let i = 0; i < count; i++) {
    const s = seed + i * 7.13;
    const p = pointInCircle(center, radiusM, s);
    // 우선순위: 시드 패턴 기반 2~5, 약 20%를 고우선(5)
    const r = frac(Math.sin(s * 91.7) * 4211.3);
    const priority = r > 0.8 ? 5 : r > 0.55 ? 4 : r > 0.25 ? 3 : 2;
    missions.push({
      lat: p.lat,
      lng: p.lng,
      instruction: instruction ?? templates[i % templates.length],
      dataType,
      priority,
      reward: rewardPerItem,
    });
  }
  return missions;
}

export function computePrepayment(
  rewardPerItem: number,
  targetCount: number
): number {
  return rewardPerItem * targetCount;
}

function frac(n: number): number {
  return n - Math.floor(n);
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100000;
}

export { DATA_TYPE };
