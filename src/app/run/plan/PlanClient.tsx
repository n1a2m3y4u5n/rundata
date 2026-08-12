"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Map } from "@/components/map/Map";
import { Button } from "@/components/ui/Button";
import { recommendRoute } from "@/lib/engines/routing";
import {
  deserializeCoverage,
  EMPTY_SNAPSHOT,
  type CoverageSnapshot,
} from "@/lib/engines/coverage";
import { startSession } from "@/app/actions/run";
import { generateDemoMissionsHere } from "@/app/actions/demo";
import { useRouter } from "next/navigation";
import { formatDistance, formatDuration } from "@/lib/geo";
import { formatWon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Activity,
  Target,
  ShieldCheck,
  MapPin,
  Wallet,
  Clock,
  Play,
  Sparkles,
  Navigation,
  Loader2,
  Waypoints,
  MapPinPlus,
  Scale,
} from "lucide-react";
import type { MapMarker } from "@/components/map/types";

type Mission = {
  id: string;
  lat: number;
  lng: number;
  priority: number;
  reward: number;
  instruction: string;
  dataType: string;
};

const TIME_OPTIONS = [20, 30, 45, 60];

export function PlanClient({
  missions,
  defaultCenter,
  avgSpeed,
  fitnessLevel,
  coverage = EMPTY_SNAPSHOT,
}: {
  missions: Mission[];
  defaultCenter: { lat: number; lng: number };
  avgSpeed: number;
  fitnessLevel: number;
  coverage?: CoverageSnapshot;
}) {
  const [start, setStart] = useState(defaultCenter);
  const [minutes, setMinutes] = useState(30);
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const router = useRouter();
  const [genPending, startGen] = useTransition();

  function generateHere() {
    startGen(async () => {
      const r = await generateDemoMissionsHere(start.lat, start.lng);
      if (r.ok) router.refresh();
    });
  }

  const targetDistance = minutes * 60 * avgSpeed;

  const coverageIndex = useMemo(
    () => deserializeCoverage(coverage),
    [coverage]
  );

  const route = useMemo(
    () =>
      recommendRoute({
        start,
        targetDistanceM: targetDistance,
        avgSpeed,
        fitnessLevel,
        missions,
        coverage: coverageIndex,
      }),
    [start, targetDistance, avgSpeed, fitnessLevel, missions, coverageIndex]
  );

  // 실제 도보 경로 (OpenRouteService) — 미션 선택 안정화 후 서버에서 지오메트리 획득
  const routeKey = JSON.stringify(route.polyline);
  const [road, setRoad] = useState<{
    polyline: [number, number][];
    distanceM: number;
  } | null>(null);
  const [roadLoading, setRoadLoading] = useState(false);
  const latestKey = useRef("");

  useEffect(() => {
    latestKey.current = routeKey;
    setRoad(null);
    if (route.intervalCount === 0) {
      setRoadLoading(false);
      return;
    }
    setRoadLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ waypoints: route.polyline }),
        });
        const data = await res.json();
        if (latestKey.current !== routeKey) return; // 최신 선택만 반영
        if (
          data?.ok &&
          Array.isArray(data.polyline) &&
          data.polyline.length >= 2
        ) {
          setRoad({ polyline: data.polyline, distanceM: data.distanceM });
        }
      } catch {
        /* 폴백: 직선 경로 유지 */
      } finally {
        if (latestKey.current === routeKey) setRoadLoading(false);
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const displayPolyline = road?.polyline ?? route.polyline;
  const displayDistance = road?.distanceM ?? route.distanceM;
  const displayDuration = road
    ? Math.round(road.distanceM / avgSpeed) + route.intervalCount * 25
    : route.estDurationS;

  const selectedIds = new Set(route.orderedMissionIds);
  const markers: MapMarker[] = [
    { id: "start", lat: start.lat, lng: start.lng, kind: "start" },
    ...missions
      .filter((m) => selectedIds.has(m.id))
      .map((m) => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        kind: "mission" as const,
        priority: m.priority,
      })),
  ];

  function useMyLocation() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStart({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  function start_() {
    startTransition(() =>
      startSession({
        polyline: displayPolyline,
        distance: displayDistance,
        estDuration: displayDuration,
        targetTime: minutes,
        targetDistance,
        workoutScore: route.workoutScore,
        missionScore: route.missionScore,
        safetyScore: route.safetyScore,
        missionIds: route.orderedMissionIds,
      })
    );
  }

  return (
    <div className="flex flex-col gap-5 px-5 pt-5">
      {/* Map */}
      <div className="card overflow-hidden p-0">
        <div className="h-64 w-full">
          <Map
            center={start}
            zoom={15}
            polyline={displayPolyline}
            markers={markers}
            fitTo="polyline"
            onClick={(lat, lng) => setStart({ lat, lng })}
            className="rounded-none border-0"
          />
        </div>
        <div className="flex divide-x divide-border border-t border-border">
          <button
            onClick={useMyLocation}
            className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium text-brand-600"
          >
            <Navigation className={cn("size-4", locating && "animate-pulse")} />
            {locating ? "위치 확인 중…" : "내 위치"}
          </button>
          <button
            onClick={generateHere}
            disabled={genPending}
            className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium text-accent-600 disabled:opacity-60"
          >
            {genPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MapPinPlus className="size-4" />
            )}
            {genPending ? "생성 중…" : "여기에 미션 생성"}
          </button>
        </div>
      </div>

      {/* Target time */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Clock className="size-4 text-muted" /> 목표 시간
        </div>
        <div className="grid grid-cols-4 gap-2">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setMinutes(t)}
              className={cn(
                "rounded-xl border py-3 text-center font-semibold transition-all",
                minutes === t
                  ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                  : "border-border text-muted hover:bg-surface-2"
              )}
            >
              <span className="font-num">{t}</span>
              <span className="text-xs">분</span>
            </button>
          ))}
        </div>
      </div>

      {/* Route summary */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-brand-600" />
            <span className="font-semibold">추천 경로</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-brand-500/12 px-2.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
            종합 {route.overallScore}점
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-num text-xl font-bold">
              {formatDistance(displayDistance)}
            </div>
            <div className="text-xs text-muted">거리</div>
          </div>
          <div>
            <div className="font-num text-xl font-bold">
              {formatDuration(displayDuration)}
            </div>
            <div className="text-xs text-muted">예상 시간</div>
          </div>
          <div>
            <div className="font-num text-xl font-bold">
              {route.intervalCount}
            </div>
            <div className="text-xs text-muted">미션</div>
          </div>
        </div>

        {/* 경로 소스 표시 */}
        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs">
          {roadLoading ? (
            <span className="flex items-center gap-1.5 text-muted">
              <Loader2 className="size-3.5 animate-spin" /> 실제 도보 경로 계산 중…
            </span>
          ) : road ? (
            <span className="flex items-center gap-1.5 font-medium text-brand-600">
              <Waypoints className="size-3.5" /> 실제 도보 경로 반영됨
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-2">
              <Waypoints className="size-3.5" /> 직선 추정 경로
            </span>
          )}
        </div>

        {/* 4-objective scores */}
        <div className="mt-5 space-y-3">
          <ScoreBar
            icon={<Activity className="size-4" />}
            label="운동 효과"
            value={route.workoutScore}
            tone="brand"
          />
          <ScoreBar
            icon={<Target className="size-4" />}
            label="미션 가치"
            value={route.missionScore}
            tone="accent"
          />
          <ScoreBar
            icon={<ShieldCheck className="size-4" />}
            label="안전성"
            value={route.safetyScore}
            tone="info"
          />
          <ScoreBar
            icon={<Scale className="size-4" />}
            label="커버리지 형평"
            value={route.equityScore}
            tone="accent"
          />
        </div>

        {route.intervalCount > 0 && route.equityScore >= 60 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-brand-500/[0.07] px-4 py-3">
            <Scale className="mt-0.5 size-4 shrink-0 text-brand-600" />
            <p className="text-xs leading-relaxed text-muted">
              이 경로는 <b className="text-foreground">최근 아무도 지나지 않은
              구역</b>을 지납니다. 데이터가 오래 비어 있던 곳일수록 우선 배치돼요.
            </p>
          </div>
        )}

        {route.intervalCount > 0 && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-accent-500/[0.07] px-4 py-3">
            <Activity className="mt-0.5 size-4 shrink-0 text-accent-600" />
            <p className="text-xs leading-relaxed text-muted">
              미션 <b className="text-foreground">{route.intervalCount}개</b>가 주행
              부하가 낮아지는 구간에 배치돼{" "}
              <b className="text-foreground">운동 흐름의 단절을 최소화</b>합니다.
              지점당 약 25초 정지를 가정해요.
            </p>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-500/[0.07] px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-muted">
            <Wallet className="size-4" /> 예상 기본 보상
          </span>
          <span className="font-num font-bold text-brand-700 dark:text-brand-300">
            {formatWon(Math.round(route.totalReward * 0.5))}
          </span>
        </div>
      </div>

      {route.intervalCount === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4 text-center">
          <MapPin className="mx-auto mb-1 size-5 text-amber-600" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            이 위치엔 수행 가능한 미션이 없어요
          </p>
          <p className="mt-0.5 text-xs text-muted">
            현장 시연이라면 지금 위치에 미션을 생성하세요.
          </p>
          <Button
            size="sm"
            className="mt-3"
            onClick={generateHere}
            loading={genPending}
          >
            <MapPinPlus className="size-4" /> 이 위치에 미션 생성
          </Button>
        </div>
      ) : null}

      <Button
        size="lg"
        fullWidth
        className="h-14 text-base"
        loading={pending}
        onClick={start_}
        disabled={route.intervalCount === 0}
      >
        <Play className="size-5 fill-current" /> 이 경로로 러닝 시작
      </Button>
    </div>
  );
}

function ScoreBar({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "brand" | "accent" | "info";
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex size-7 items-center justify-center rounded-lg",
          tone === "brand" && "bg-brand-500/12 text-brand-600",
          tone === "accent" && "bg-accent-500/12 text-accent-600",
          tone === "info" && "bg-sky-500/12 text-sky-600"
        )}
      >
        {icon}
      </div>
      <div className="w-16 text-sm text-muted">{label}</div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-inset">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            tone === "brand" && "bg-brand-500",
            tone === "accent" && "bg-accent-500",
            tone === "info" && "bg-sky-500"
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="w-8 text-right font-num text-sm font-semibold tnum">
        {value}
      </div>
    </div>
  );
}
