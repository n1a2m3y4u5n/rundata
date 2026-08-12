import "server-only";

export type LatLng = [number, number]; // [lat, lng]

export type WalkingRoute = {
  polyline: LatLng[];
  distanceM: number;
  durationS: number;
};

/**
 * 실제 보행 경로 지오메트리 — 경유점을 도로/보행로를 따르는 실경로로 변환.
 * 1차: FOSSGIS 공개 OSRM(도보, 무키 · openstreetmap.org 라우터, 빠르고 안정적)
 * 2차: OpenRouteService(ORS_API_KEY 있을 때) — OSRM 실패 시 폴백
 * 둘 다 실패하면 null → 호출부에서 직선 경로로 폴백.
 */
export async function fetchWalkingRoute(
  waypoints: LatLng[]
): Promise<WalkingRoute | null> {
  if (waypoints.length < 2) return null;
  return (await viaOsrm(waypoints)) ?? (await viaOrs(waypoints));
}

const OSRM_FOOT =
  "https://routing.openstreetmap.de/routed-foot/route/v1/foot";

async function viaOsrm(waypoints: LatLng[]): Promise<WalkingRoute | null> {
  // OSRM URL 좌표 순서는 lng,lat
  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_FOOT}/${coords}?overview=full&geometries=geojson`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== "Ok") return null;
    const route = data.routes?.[0];
    const coordsOut = route?.geometry?.coordinates as
      | [number, number][]
      | undefined;
    if (!coordsOut || coordsOut.length < 2) return null;
    return {
      polyline: coordsOut.map(([lng, lat]) => [lat, lng] as LatLng),
      distanceM: Math.round(route.distance ?? 0),
      durationS: Math.round(route.duration ?? 0),
    };
  } catch {
    return null;
  }
}

async function viaOrs(waypoints: LatLng[]): Promise<WalkingRoute | null> {
  const key = process.env.ORS_API_KEY;
  if (!key) return null;
  // ORS 좌표 순서는 [lng, lat]
  const coordinates = waypoints.map(([lat, lng]) => [lng, lat]);
  try {
    const res = await fetch(
      "https://api.openrouteservice.org/v2/directions/foot-walking/geojson",
      {
        method: "POST",
        headers: { Authorization: key, "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates }),
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const feat = data?.features?.[0];
    const coords = feat?.geometry?.coordinates as [number, number][] | undefined;
    if (!coords || coords.length < 2) return null;
    const summary = feat?.properties?.summary ?? {};
    return {
      polyline: coords.map(([lng, lat]) => [lat, lng] as LatLng),
      distanceM: Math.round(summary.distance ?? 0),
      durationS: Math.round(summary.duration ?? 0),
    };
  } catch {
    return null;
  }
}
