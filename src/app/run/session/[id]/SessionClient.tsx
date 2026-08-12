"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Map } from "@/components/map/Map";
import { CaptureSheet, type SheetMission } from "./CaptureSheet";
import { submitMission, finishSession } from "@/app/actions/run";
import type { SubmitMissionResult } from "@/app/actions/run";
import { ProcessingSheet } from "./ProcessingSheet";
import { haversine, pointAtDistance, pathLength, formatDistance, formatDuration, formatPace } from "@/lib/geo";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  Flag,
  Gauge,
  Sparkles,
  Camera,
} from "lucide-react";
import type { MapMarker } from "@/components/map/types";

type RunMission = {
  id: string;
  lat: number;
  lng: number;
  instruction: string;
  dataType: string;
  reward: number;
  priority: number;
  done: boolean;
};

const ARRIVE_THRESHOLD_M = 40;
const SUBSTEP_M = 20; // 한 tick 내 근접감지 스윕 간격(배속에서도 미션을 건너뛰지 않도록)
const TICK_MS = 400;

export function SessionClient({
  sessionId,
  polyline,
  missions,
  avgSpeed,
  distanceTarget,
}: {
  sessionId: string;
  polyline: [number, number][];
  missions: RunMission[];
  avgSpeed: number;
  distanceTarget: number;
}) {
  const path = useMemo(
    () => polyline.map(([lat, lng]) => ({ lat, lng })),
    [polyline]
  );
  const totalDist = useMemo(() => pathLength(path), [path]);
  const simSpeed = Math.max(avgSpeed * 9, totalDist / 55); // m/s (데모 가속)

  const [running, setRunning] = useState(true);
  const [multiplier, setMultiplier] = useState(1);
  const [distance, setDistance] = useState(0);
  const [pos, setPos] = useState(path[0] ?? { lat: 0, lng: 0 });
  const [done, setDone] = useState<Set<string>>(
    new Set(missions.filter((m) => m.done).map((m) => m.id))
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<SheetMission | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [finishing, startFinish] = useTransition();
  const [processing, setProcessing] = useState<SubmitMissionResult | null>(
    null
  );
  const [reachedEnd, setReachedEnd] = useState(false);
  const track = useRef<[number, number, number][]>([]);
  const distanceRef = useRef(0); // 진행 거리의 단일 진실원(부수효과를 setState 업데이터 밖에서 수행)

  const duration = Math.round(distance / avgSpeed);
  const remaining = missions.length - done.size;

  // 시뮬레이션 루프 — 부수효과는 순수 콜백에서 수행하고, 한 tick을 서브스텝으로 스윕한다.
  useEffect(() => {
    if (!running || active || processing) return;
    const iv = setInterval(() => {
      const totalStep = simSpeed * (TICK_MS / 1000) * multiplier;
      const target = Math.min(totalDist, distanceRef.current + totalStep);
      let d = distanceRef.current;
      let hitMission: RunMission | null = null;
      let hitPoint = pos;
      let finishedFlag = false;

      while (d < target) {
        d = Math.min(target, d + SUBSTEP_M);
        const { point, finished } = pointAtDistance(path, d);
        const m = missions.find(
          (mm) =>
            !done.has(mm.id) &&
            !dismissed.has(mm.id) &&
            haversine(point, { lat: mm.lat, lng: mm.lng }) <= ARRIVE_THRESHOLD_M
        );
        if (m) {
          hitMission = m;
          hitPoint = point;
          break;
        }
        if (finished) {
          finishedFlag = true;
          hitPoint = point;
          break;
        }
        hitPoint = point;
      }

      distanceRef.current = d;
      setDistance(d);
      setPos(hitPoint);
      track.current.push([hitPoint.lat, hitPoint.lng, Math.round(d / avgSpeed)]);

      if (hitMission) {
        setRunning(false);
        setActive({
          id: hitMission.id,
          instruction: hitMission.instruction,
          dataType: hitMission.dataType,
          reward: hitMission.reward,
          lat: hitMission.lat,
          lng: hitMission.lng,
        });
      } else if (finishedFlag) {
        setRunning(false);
        setReachedEnd(true);
      }
    }, TICK_MS);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, active, processing, multiplier, path, missions, done, dismissed, simSpeed, totalDist, avgSpeed]);

  function onSubmit(data: { photoData?: string; observationData?: Record<string, number> }) {
    if (!active) return;
    startSubmit(async () => {
      const res = await submitMission({
        missionId: active.id,
        sessionId,
        photoData: data.photoData,
        observationData: data.observationData,
        lat: pos.lat,
        lng: pos.lng,
      });
      if (res.ok) {
        setDone((s) => new Set(s).add(active.id));
        setActive(null);
        setProcessing(res); // 정제 파이프라인 표시 (running은 false 유지)
      } else {
        // 이미 수집된 미션 등 — 시트를 닫고 계속 진행
        setDismissed((s) => new Set(s).add(active.id));
        setActive(null);
        setRunning(true);
      }
    });
  }

  function skipMission() {
    if (!active) return;
    setDismissed((s) => new Set(s).add(active.id));
    setActive(null);
    setRunning(true);
  }

  function finish() {
    setRunning(false); // 종료 즉시 시뮬레이션 정지
    const dist = Math.round(distanceRef.current);
    startFinish(() =>
      finishSession({
        sessionId,
        trackPoints: track.current,
        distance: dist,
        duration: Math.round(dist / avgSpeed),
        avgPace: Math.round(1000 / avgSpeed),
        intervalCount: done.size,
      })
    );
  }

  const markers: MapMarker[] = [
    ...missions.map((m) => ({
      id: m.id,
      lat: m.lat,
      lng: m.lng,
      kind: "mission" as const,
      priority: m.priority,
      status: done.has(m.id) ? "COMPLETED" : "OPEN",
    })),
    { id: "me", lat: pos.lat, lng: pos.lng, kind: "runner" as const, pulse: true },
  ];

  const progressPct = totalDist ? (distance / totalDist) * 100 : 0;

  return (
    <div className="relative flex h-dvh flex-col">
      {/* Map */}
      <div className="relative min-h-0 flex-1">
        <Map
          center={pos}
          zoom={16}
          polyline={polyline}
          markers={markers}
          fitTo="polyline"
          className="rounded-none border-0"
        />

        {/* Top stats overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-4">
          <div className="glass pointer-events-auto rounded-2xl border border-border p-4 shadow-lg">
            <div className="grid grid-cols-3 divide-x divide-border text-center">
              <div className="px-2">
                <div className="font-num text-2xl font-bold tabular-nums">
                  {formatDuration(duration)}
                </div>
                <div className="text-xs text-muted">운동 시간</div>
              </div>
              <div className="px-2">
                <div className="font-num text-2xl font-bold tabular-nums">
                  {(distance / 1000).toFixed(2)}
                </div>
                <div className="text-xs text-muted">거리 (km)</div>
              </div>
              <div className="px-2">
                <div className="font-num text-2xl font-bold tabular-nums">
                  {formatPace(1000 / avgSpeed)}
                </div>
                <div className="text-xs text-muted">페이스</div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-inset">
                <div
                  className="h-full brand-gradient transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                <Camera className="size-3.5" /> {done.size}/{missions.length}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom controls (캡처/정제 시트가 열려있으면 숨겨 겹침 방지) */}
      {!active && !processing && (
      <div className="z-[500] border-t border-border bg-surface p-4">
        {reachedEnd && remaining === 0 && (
          <div className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-brand-500/10 py-2.5 text-sm font-medium text-brand-700 dark:text-brand-300">
            <Sparkles className="size-4" /> 경로 완주! 모든 미션을 완료했어요
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMultiplier((m) => (m === 1 ? 2 : 1))}
            className="flex h-13 items-center gap-1.5 rounded-xl border border-border px-4 text-sm font-semibold text-muted"
          >
            <Gauge className="size-4" />
            {multiplier}x
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="flex h-13 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-2 font-semibold"
          >
            {running ? (
              <>
                <Pause className="size-5" /> 일시정지
              </>
            ) : (
              <>
                <Play className="size-5 fill-current" /> 재개
              </>
            )}
          </button>
          <button
            onClick={finish}
            disabled={finishing}
            className="flex h-13 items-center gap-2 rounded-xl bg-danger px-5 font-semibold text-white disabled:opacity-60"
          >
            <Flag className="size-5" /> 종료
          </button>
        </div>
      </div>
      )}

      {active && (
        <CaptureSheet
          mission={active}
          onSubmit={onSubmit}
          onClose={skipMission}
          submitting={submitting}
        />
      )}

      {processing && (
        <ProcessingSheet
          result={processing}
          onDone={() => {
            setProcessing(null);
            setRunning(true);
          }}
        />
      )}
    </div>
  );
}
