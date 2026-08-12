// 커버리지 형평 엔진
//
// 참여형 데이터 수집은 내버려 두면 "사람이 많은 곳"에만 데이터가 쌓인다.
// 이는 민원 기반 행정이 신고할 시민이 있는 지역만 관측하게 되는 것과 같은 실패이며,
// 국토교통부 도로위험 신고의 약 64%가 활동비를 받는 국민참여단에서 나오는 현상,
// 그리고 일부 기초자치단체가 점자블록 현황 자료 자체를 보유하지 못한 현상의 원인이다.
//
// 본 엔진은 도시를 격자로 나누고 각 격자의 "마지막 수집 시각"을 추적하여,
// 오래 비어 있는 격자일수록 경로 추천과 보상에서 가중치를 높인다.
// 편중을 부작용으로 방치하지 않고 목적함수 안에서 관리하는 것이 목적이다.

import { type LatLng } from "../geo";

/** 격자 한 변의 길이(m). 도시 보행 스케일 기준. */
export const GRID_SIZE_M = 200;

/** 이 일수를 넘겨 비어 있으면 형평 가중치가 최대가 된다. */
export const EQUITY_SATURATION_DAYS = 30;

/** 형평 가중치의 최대 증폭 배수. weight ∈ [1, 1 + EQUITY_STRENGTH] */
export const EQUITY_STRENGTH = 1.2;

/** 한 번도 수집된 적 없는 격자에 부여하는 가상 경과일 (최댓값 취급) */
export const NEVER_COLLECTED_DAYS = EQUITY_SATURATION_DAYS;

const M_PER_DEG_LAT = 111_320;
const toRad = (d: number) => (d * Math.PI) / 180;

/** 격자 식별자. "위도인덱스:경도인덱스" */
export type GridKey = string;

/** 좌표 → 격자 키 */
export function gridKey(lat: number, lng: number): GridKey {
  const dLat = GRID_SIZE_M / M_PER_DEG_LAT;
  const dLng = GRID_SIZE_M / (M_PER_DEG_LAT * Math.cos(toRad(lat)) || 1);
  return `${Math.floor(lat / dLat)}:${Math.floor(lng / dLng)}`;
}

/** 격자 키 → 격자 중심 좌표 (지도 시각화용) */
export function gridCenter(key: GridKey): LatLng {
  const [iLat, iLng] = key.split(":").map(Number);
  const dLat = GRID_SIZE_M / M_PER_DEG_LAT;
  const lat = (iLat + 0.5) * dLat;
  const dLng = GRID_SIZE_M / (M_PER_DEG_LAT * Math.cos(toRad(lat)) || 1);
  return { lat, lng: (iLng + 0.5) * dLng };
}

/** 격자 키 → 사각형 경계 [[남서], [북동]] (지도 오버레이용) */
export function gridBounds(key: GridKey): [[number, number], [number, number]] {
  const [iLat, iLng] = key.split(":").map(Number);
  const dLat = GRID_SIZE_M / M_PER_DEG_LAT;
  const latS = iLat * dLat;
  const latN = (iLat + 1) * dLat;
  const dLng = GRID_SIZE_M / (M_PER_DEG_LAT * Math.cos(toRad(latS)) || 1);
  return [
    [latS, iLng * dLng],
    [latN, (iLng + 1) * dLng],
  ];
}

export type CollectionRecord = { lat: number; lng: number; capturedAt: Date };

/** 격자별 최종 수집 시각 + 누적 수집 건수 */
export type CoverageIndex = {
  lastCollected: Map<GridKey, number>; // epoch ms
  counts: Map<GridKey, number>;
  now: number;
};

/** 승인된 수집 이력으로 커버리지 인덱스를 구축한다. */
export function buildCoverageIndex(
  records: CollectionRecord[],
  now: number = Date.now()
): CoverageIndex {
  const lastCollected = new Map<GridKey, number>();
  const counts = new Map<GridKey, number>();
  for (const r of records) {
    const k = gridKey(r.lat, r.lng);
    const t = r.capturedAt.getTime();
    const prev = lastCollected.get(k);
    if (prev === undefined || t > prev) lastCollected.set(k, t);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return { lastCollected, counts, now };
}

export const EMPTY_COVERAGE: CoverageIndex = {
  lastCollected: new Map(),
  counts: new Map(),
  now: 0,
};

/**
 * 서버 컴포넌트 → 클라이언트 컴포넌트 전달용 평문 형태.
 * Map은 직렬화되지 않으므로 서버 경계를 넘길 때는 이 형태를 쓴다.
 */
export type CoverageSnapshot = {
  lastCollected: Record<GridKey, number>;
  counts: Record<GridKey, number>;
  now: number;
};

export function serializeCoverage(index: CoverageIndex): CoverageSnapshot {
  return {
    lastCollected: Object.fromEntries(index.lastCollected),
    counts: Object.fromEntries(index.counts),
    now: index.now,
  };
}

export function deserializeCoverage(snap: CoverageSnapshot): CoverageIndex {
  return {
    lastCollected: new Map(Object.entries(snap.lastCollected)),
    counts: new Map(Object.entries(snap.counts)),
    now: snap.now,
  };
}

export const EMPTY_SNAPSHOT: CoverageSnapshot = {
  lastCollected: {},
  counts: {},
  now: 0,
};

/** 해당 좌표가 속한 격자가 며칠째 비어 있는가 */
export function gapDaysAt(index: CoverageIndex, lat: number, lng: number): number {
  const t = index.lastCollected.get(gridKey(lat, lng));
  if (t === undefined) return NEVER_COLLECTED_DAYS;
  const now = index.now || Date.now();
  return Math.max(0, (now - t) / 86_400_000);
}

/**
 * 형평 가중치. 오래 비어 있을수록 크다.
 * 반환값 ∈ [1, 1 + EQUITY_STRENGTH]
 */
export function equityWeight(gapDays: number): number {
  const norm = Math.min(1, gapDays / EQUITY_SATURATION_DAYS);
  return 1 + EQUITY_STRENGTH * norm;
}

/** 좌표 기준 형평 가중치 바로 구하기 */
export function equityWeightAt(
  index: CoverageIndex,
  lat: number,
  lng: number
): number {
  return equityWeight(gapDaysAt(index, lat, lng));
}

/**
 * 보상 형평 보정.
 * 오래 비어 있는 격자의 미션은 러너에게 더 높은 보상을 제시하여,
 * "데이터가 없는 곳"이 오히려 매력적인 코스가 되도록 만든다.
 * 10원 단위로 반올림한다.
 */
export function adjustRewardForEquity(
  baseReward: number,
  gapDays: number
): number {
  const raw = baseReward * equityWeight(gapDays);
  return Math.round(raw / 10) * 10;
}

/** 격자 단위 커버리지 요약 (관리자 콘솔 시각화용) */
export type CoverageCell = {
  key: GridKey;
  center: LatLng;
  bounds: [[number, number], [number, number]];
  count: number;
  gapDays: number;
  /** 0(최근 수집됨) ~ 1(오래 비어 있음) */
  staleness: number;
};

/**
 * 관심 영역(중심 + 반경) 안의 격자를 훑어 커버리지 셀 목록을 만든다.
 * 수집 이력이 전혀 없는 격자도 포함해야 "비어 있는 곳"이 보이므로,
 * 인덱스에 있는 격자만이 아니라 영역 전체를 순회한다.
 */
export function summarizeCoverage(
  index: CoverageIndex,
  center: LatLng,
  radiusM: number
): CoverageCell[] {
  const dLat = GRID_SIZE_M / M_PER_DEG_LAT;
  const dLng = GRID_SIZE_M / (M_PER_DEG_LAT * Math.cos(toRad(center.lat)) || 1);
  const stepsLat = Math.ceil(radiusM / GRID_SIZE_M);
  const stepsLng = Math.ceil(radiusM / GRID_SIZE_M);
  const iLat0 = Math.floor(center.lat / dLat);
  const iLng0 = Math.floor(center.lng / dLng);

  const cells: CoverageCell[] = [];
  for (let a = -stepsLat; a <= stepsLat; a++) {
    for (let b = -stepsLng; b <= stepsLng; b++) {
      const key: GridKey = `${iLat0 + a}:${iLng0 + b}`;
      const cCenter = gridCenter(key);
      const t = index.lastCollected.get(key);
      const gapDays =
        t === undefined
          ? NEVER_COLLECTED_DAYS
          : Math.max(0, ((index.now || Date.now()) - t) / 86_400_000);
      cells.push({
        key,
        center: cCenter,
        bounds: gridBounds(key),
        count: index.counts.get(key) ?? 0,
        gapDays,
        staleness: Math.min(1, gapDays / EQUITY_SATURATION_DAYS),
      });
    }
  }
  return cells;
}

/** 커버리지 지표 — "이 구역의 몇 %가 최근 관측되었는가" */
export function coverageStats(cells: CoverageCell[]) {
  const total = cells.length || 1;
  const observed = cells.filter((c) => c.count > 0).length;
  const stale = cells.filter((c) => c.count > 0 && c.staleness >= 1).length;
  const never = cells.filter((c) => c.count === 0).length;
  const avgStaleness = cells.reduce((s, c) => s + c.staleness, 0) / total;
  return {
    totalCells: cells.length,
    observedCells: observed,
    neverCells: never,
    staleCells: stale,
    coverageRate: Math.round((observed / total) * 100),
    avgStaleness: Math.round(avgStaleness * 100),
  };
}
