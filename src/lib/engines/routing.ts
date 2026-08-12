// 경로 추천 엔진
// 운동 효과 · 미션 수집 가치 · 안전성 · 커버리지 형평 네 가지 목적함수를
// 동시에 고려하여 러너의 목표(시간/거리)에 맞는 순환 경로를 산출한다.
//
// 네 번째 목적함수(커버리지 형평)가 본 플랫폼을 일반 크라우드소싱과 구분한다.
// 참여형 수집은 그대로 두면 사람이 많은 곳에만 데이터가 쌓이고, 사람이 적은 곳은
// 계속 비어 있다. 오래 관측되지 않은 격자일수록 가중치를 높여, 데이터가 부족한
// 구역이 오히려 러너에게 매력적인 코스가 되도록 만든다.

import { haversine, pathLength, type LatLng } from "../geo";
import {
  EMPTY_COVERAGE,
  equityWeightAt,
  gapDaysAt,
  EQUITY_SATURATION_DAYS,
  type CoverageIndex,
} from "./coverage";

export type RouteMissionInput = {
  id: string;
  lat: number;
  lng: number;
  priority: number;
  reward: number;
};

export type RouteInput = {
  start: LatLng;
  targetDistanceM: number;
  avgSpeed: number; // m/s
  fitnessLevel: number; // 0~100
  missions: RouteMissionInput[];
  /** 격자별 최종 수집 시각 인덱스. 없으면 형평 가중치는 중립(모두 동일)으로 동작한다. */
  coverage?: CoverageIndex;
};

export type RouteResult = {
  orderedMissionIds: string[];
  polyline: [number, number][];
  distanceM: number;
  estDurationS: number;
  workoutScore: number;
  missionScore: number;
  safetyScore: number;
  /** 이 경로가 얼마나 "비어 있던 구역"을 채우는가 (0~100) */
  equityScore: number;
  overallScore: number;
  intervalCount: number;
  totalReward: number;
};

const DWELL_PER_MISSION_S = 25; // 미션 지점 체류(회복 구간)
const ROAD_FACTOR = 1.35; // 실제 도보 경로는 직선 대비 약 1.35배 (우회 보정, 지역별 편차 존재)

/** 좌표 기반 안정적 안전 프록시 (가로등·보행환경 대체) */
function segmentSafety(a: LatLng, b: LatLng): number {
  const key = Math.sin((a.lat + b.lng) * 137.5 + (b.lat + a.lng) * 42.1);
  const base = 62 + (key - Math.floor(key)) * 33; // 62~95
  const len = haversine(a, b);
  const penalty = len > 400 ? Math.min(18, (len - 400) / 40) : 0; // 고립 구간 감점
  return Math.max(35, base - penalty);
}

export function recommendRoute(input: RouteInput): RouteResult {
  const { start, targetDistanceM, avgSpeed, missions } = input;
  const coverageIndex = input.coverage ?? EMPTY_COVERAGE;
  // 인덱스가 비어 있으면(now === 0) 모든 격자가 동일 취급되어 형평 항이 중립이 된다.
  const equityActive = coverageIndex.now > 0;
  const budget = Math.max(500, targetDistanceM); // 목표 도로 거리
  // 도로는 직선 대비 우회하므로, 직선 선택 예산을 축소해
  // 최종 도로 경로가 목표 거리에 근접하도록 한다.
  const selectionBudget = budget / ROAD_FACTOR;
  // 미션 수 상한 (약 260m당 1개, 5~24개) — 촘촘한 수집 경험
  const maxMissions = Math.max(
    5,
    Math.min(24, Math.round(selectionBudget / 260))
  );

  // 1) 도달 가능 후보: 출발점에서 예산의 60% 반경 이내
  const reachable = missions
    .map((m) => ({ m, d: haversine(start, { lat: m.lat, lng: m.lng }) }))
    .filter((x) => x.d <= selectionBudget * 0.6)
    .sort((a, b) => a.d - b.d);

  // 2) 그리디: 미션가치/이동비용이 높은 순으로, 복귀 가능성 유지
  const selected: RouteMissionInput[] = [];
  let current: LatLng = start;
  let dist = 0;
  const pool = reachable.map((x) => x.m);

  while (pool.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const m = pool[i];
      const mp = { lat: m.lat, lng: m.lng };
      const travel = haversine(current, mp);
      const backToStart = haversine(mp, start);
      if (dist + travel + backToStart > selectionBudget * 1.08) continue; // 예산 초과 방지
      // 의뢰 우선순위 × 커버리지 형평 가중치.
      // 오래 관측되지 않은 격자의 미션일수록 최대 (1 + EQUITY_STRENGTH)배까지 우대된다.
      const value =
        Math.pow(m.priority, 1.5) *
        (equityActive ? equityWeightAt(coverageIndex, m.lat, m.lng) : 1);
      const score = value / (travel + 60);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    if (dist >= selectionBudget * 0.85) break;
    if (selected.length >= maxMissions) break;
    const chosen = pool.splice(bestIdx, 1)[0];
    dist += haversine(current, { lat: chosen.lat, lng: chosen.lng });
    current = { lat: chosen.lat, lng: chosen.lng };
    selected.push(chosen);
  }

  // 3) 경로 구성 (순환) — 선택된 실제 미션 지점만으로 시작→미션들→시작.
  //    합성 패딩 우회점은 도로 밖에 찍혀 OSRM 스냅 실패/직선 튐(뜬금없는 긴 직선)을
  //    유발하므로 사용하지 않는다. 목표 거리 미달분은 품질 점수(distMatch)에만 반영.
  const points: LatLng[] = [
    start,
    ...selected.map((m) => ({ lat: m.lat, lng: m.lng })),
  ];
  const closed = [...points, start];
  const totalDist = pathLength(closed);

  // 도로 우회 보정을 적용한 예상 실제 거리 (목표와 비교/표시용)
  const roadDist = Math.round(totalDist * ROAD_FACTOR);

  // 4) 목적함수 산정
  const intervalCount = selected.length;
  const distMatch = 1 - Math.min(1, Math.abs(roadDist - budget) / budget);
  const intervalScore = Math.min(1, intervalCount / 6);
  const workoutScore = Math.round((0.6 * distMatch + 0.4 * intervalScore) * 100);

  const avgPriority = intervalCount
    ? selected.reduce((s, m) => s + m.priority, 0) / intervalCount
    : 0;
  const quality = avgPriority / 5;
  const density = Math.min(1, intervalCount / 8);
  const missionScore = Math.round((0.6 * quality + 0.4 * density) * 100);

  let safetySum = 0;
  for (let i = 1; i < closed.length; i++) {
    safetySum += segmentSafety(closed[i - 1], closed[i]);
  }
  const safetyScore = Math.round(safetySum / (closed.length - 1));

  // 형평 점수: 선택된 미션들이 평균적으로 얼마나 오래 비어 있던 격자에 있는가.
  // 수집 이력이 없는 상태에서는 비교 기준이 없으므로 중립값 50을 사용한다.
  const equityScore =
    equityActive && intervalCount
      ? Math.round(
          (selected.reduce(
            (s, m) =>
              s +
              Math.min(1, gapDaysAt(coverageIndex, m.lat, m.lng) / EQUITY_SATURATION_DAYS),
            0
          ) /
            intervalCount) *
            100
        )
      : 50;

  const overallScore = Math.round(
    workoutScore * 0.35 +
      missionScore * 0.3 +
      safetyScore * 0.2 +
      equityScore * 0.15
  );

  const estDurationS = Math.round(
    roadDist / avgSpeed + intervalCount * DWELL_PER_MISSION_S
  );

  return {
    orderedMissionIds: selected.map((m) => m.id),
    polyline: closed.map((p) => [p.lat, p.lng] as [number, number]),
    distanceM: roadDist,
    estDurationS,
    workoutScore,
    missionScore,
    safetyScore,
    equityScore,
    overallScore,
    intervalCount,
    totalReward: selected.reduce((s, m) => s + m.reward, 0),
  };
}

/** 페이스(s/km) 기반 심박존 추정 (러너 프로필의 avgSpeed 대비 상대 강도) */
export function estimateHrZone(
  paceSecPerKm: number,
  avgSpeed: number
): { zone: number; label: string } {
  const avgPace = 1000 / avgSpeed; // s/km
  const ratio = avgPace / paceSecPerKm; // >1 이면 평소보다 빠름
  if (ratio >= 1.25) return { zone: 5, label: "최대 강도" };
  if (ratio >= 1.1) return { zone: 4, label: "고강도" };
  if (ratio >= 0.95) return { zone: 3, label: "중강도" };
  if (ratio >= 0.8) return { zone: 2, label: "유산소" };
  return { zone: 1, label: "회복" };
}
