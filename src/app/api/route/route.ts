import { NextRequest, NextResponse } from "next/server";
import { fetchWalkingRoute, type LatLng } from "@/lib/engines/directions";
import { getSessionUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => null);
  const waypoints = body?.waypoints as LatLng[] | undefined;
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return NextResponse.json({ ok: false, source: "straight" });
  }
  // 안전 상한: 경유점 50개
  const trimmed = waypoints.slice(0, 50);

  const result = await fetchWalkingRoute(trimmed);
  if (!result) return NextResponse.json({ ok: false, source: "straight" });

  return NextResponse.json({ ok: true, source: "road", ...result });
}
