// 지리 계산 유틸 (PostGIS 없이 haversine 기반)

export type LatLng = { lat: number; lng: number };

const R = 6371000; // 지구 반지름(m)
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** 두 지점 간 거리(m) */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 시작점에서 방위각(deg)·거리(m)만큼 떨어진 지점 */
export function destination(
  origin: LatLng,
  bearingDeg: number,
  distanceM: number
): LatLng {
  const br = toRad(bearingDeg);
  const dr = distanceM / R;
  const lat1 = toRad(origin.lat);
  const lng1 = toRad(origin.lng);
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dr) +
      Math.cos(lat1) * Math.sin(dr) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(dr) * Math.cos(lat1),
      Math.cos(dr) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: toDeg(lat2), lng: toDeg(lng2) };
}

/** 두 지점 사이 방위각(deg) */
export function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 원 내부의 결정적 의사난수 지점 (seed로 재현 가능) */
export function pointInCircle(
  center: LatLng,
  radiusM: number,
  seed: number
): LatLng {
  const rand1 = frac(Math.sin(seed * 12.9898) * 43758.5453);
  const rand2 = frac(Math.sin(seed * 78.233) * 12543.1234);
  const dist = Math.sqrt(rand1) * radiusM;
  const brng = rand2 * 360;
  return destination(center, brng, dist);
}

function frac(n: number): number {
  return n - Math.floor(n);
}

/** 폴리라인 총 길이(m) */
export function pathLength(points: LatLng[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) {
    sum += haversine(points[i - 1], points[i]);
  }
  return sum;
}

/** 폴리라인 위에서 시작점 기준 distanceM 떨어진 지점 (선형 보간) */
export function pointAtDistance(
  points: LatLng[],
  distanceM: number
): { point: LatLng; finished: boolean } {
  if (points.length === 0) return { point: { lat: 0, lng: 0 }, finished: true };
  if (distanceM <= 0) return { point: points[0], finished: false };
  let remaining = distanceM;
  for (let i = 1; i < points.length; i++) {
    const seg = haversine(points[i - 1], points[i]);
    if (remaining <= seg || i === points.length - 1) {
      if (remaining >= seg && i === points.length - 1) {
        return { point: points[points.length - 1], finished: true };
      }
      const t = seg === 0 ? 0 : remaining / seg;
      return {
        point: {
          lat: points[i - 1].lat + (points[i].lat - points[i - 1].lat) * t,
          lng: points[i - 1].lng + (points[i].lng - points[i - 1].lng) * t,
        },
        finished: false,
      };
    }
    remaining -= seg;
  }
  return { point: points[points.length - 1], finished: true };
}

export function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)}km` : `${Math.round(m)}m`;
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}시간 ${m % 60}분`;
  }
  return s > 0 && m < 10 ? `${m}분 ${s}초` : `${m}분`;
}

/** 페이스 (s/km) → "m'ss"/km" */
export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return "-";
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm % 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}'${String(s).padStart(2, "0")}"`;
}
