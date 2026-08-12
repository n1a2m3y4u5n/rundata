"use client";

import { useEffect, useMemo, useState } from "react";
import { formatWon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { SubmitMissionResult } from "@/app/actions/run";
import {
  MapPin,
  Gauge,
  Tag,
  Lock,
  Cpu,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock3,
  Sparkles,
} from "lucide-react";

type Step = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string; // 실제 처리 주체 표기(예: Claude Vision)
  tone: "brand" | "accent" | "warn";
};

/** 마스킹 단계 설명 — 실제 탐지 결과 반영 */
function maskingValue(r: SubmitMissionResult): string {
  if (!r.hasPhoto) return "해당 없음 (체감 데이터)";
  if (r.piiCount > 0) {
    return r.masked
      ? `얼굴·번호판 ${r.piiCount}개 영역 블러 비식별화`
      : `얼굴·번호판 ${r.piiCount}개 영역 탐지 · 승인 시 블러`;
  }
  if (r.aiPowered) return "개인정보 미검출 · 원본 유지";
  return r.masked ? "개인정보 영역 블러 처리" : "검수 승인 시 적용";
}

export function ProcessingSheet({
  result,
  onDone,
}: {
  result: SubmitMissionResult;
  onDone: () => void;
}) {
  const steps = useMemo<Step[]>(() => {
    const s: Step[] = [
      {
        icon: MapPin,
        label: "위치 검증",
        value: `미션 지점에서 ${result.distanceM}m · ${
          result.gpsMatch ? "일치" : "오차"
        }`,
        tone: "brand",
      },
      {
        icon: Gauge,
        label: "품질 평가",
        value: `종합 품질 ${result.qualityScore}점`,
        tone: "brand",
      },
      {
        icon: Tag,
        label: "AI 자동 라벨링",
        value: result.labels.slice(0, 4).join(" · ") || "라벨 없음",
        hint: result.aiPowered ? "Claude Vision" : undefined,
        tone: "accent",
      },
      {
        icon: Lock,
        label: "개인정보 마스킹",
        value: maskingValue(result),
        hint: result.hasPhoto ? "BlazeFace+Claude" : undefined,
        tone: "accent",
      },
      {
        icon: Cpu,
        label: "자동 검수 판정",
        value:
          result.decision === "APPROVED"
            ? "자동 승인 (품질 80점 이상)"
            : result.decision === "REJECTED"
            ? "자동 반려 (품질 기준 미달)"
            : "관리자 검수 대기 (경계 구간)",
        tone:
          result.decision === "REJECTED"
            ? "warn"
            : result.decision === "APPROVED"
            ? "brand"
            : "accent",
      },
    ];
    return s;
  }, [result]);

  const [revealed, setRevealed] = useState(0);
  const allDone = revealed >= steps.length;

  // 단계 순차 공개 (실제 처리처럼)
  useEffect(() => {
    if (allDone) return;
    const t = setTimeout(
      () => setRevealed((r) => r + 1),
      revealed === 0 ? 300 : 480
    );
    return () => clearTimeout(t);
  }, [revealed, allDone]);

  // 완료 후 자동 진행
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  const reward = result.baseCredit + result.bonus;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onDone}
      />
      <div className="fade-up relative z-10 w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-8">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border-strong" />

        <div className="mb-4 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent-500/12 text-accent-600">
            {allDone ? (
              <Sparkles className="size-4" />
            ) : (
              <Loader2 className="size-4 animate-spin" />
            )}
          </div>
          <div>
            <div className="text-sm font-semibold">
              {allDone ? "정제 완료" : "데이터 정제 처리 중…"}
            </div>
            <div className="text-xs text-muted">
              {result.aiPowered
                ? "Claude Vision · 정합성 알고리즘 실시간 처리"
                : "수집 데이터를 알고리즘이 실시간 처리합니다"}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          {steps.map((step, i) => {
            const state =
              i < revealed ? "done" : i === revealed ? "active" : "pending";
            return (
              <div
                key={step.label}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all",
                  state === "pending"
                    ? "border-transparent opacity-35"
                    : "border-border",
                  state === "active" && "fade-up"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg",
                    state === "done"
                      ? step.tone === "accent"
                        ? "bg-accent-500/12 text-accent-600"
                        : step.tone === "warn"
                        ? "bg-amber-500/12 text-amber-600"
                        : "bg-brand-500/12 text-brand-600"
                      : "bg-surface-2 text-muted-2"
                  )}
                >
                  <step.icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium">{step.label}</span>
                    {step.hint && (
                      <span className="shrink-0 rounded bg-accent-500/12 px-1.5 py-0.5 text-[0.6rem] font-semibold tracking-tight text-accent-600">
                        {step.hint}
                      </span>
                    )}
                  </div>
                  {state === "done" && (
                    <div className="truncate text-xs text-muted">
                      {step.value}
                    </div>
                  )}
                  {state === "active" && (
                    <div className="text-xs text-muted-2">처리 중…</div>
                  )}
                </div>
                <div className="shrink-0">
                  {state === "done" ? (
                    <Check
                      className={cn(
                        "size-4",
                        step.tone === "warn"
                          ? "text-amber-600"
                          : step.tone === "accent"
                          ? "text-accent-600"
                          : "text-brand-600"
                      )}
                    />
                  ) : state === "active" ? (
                    <Loader2 className="size-4 animate-spin text-muted-2" />
                  ) : (
                    <div className="size-1.5 rounded-full bg-border-strong" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 결과 */}
        {allDone && (
          <div className="fade-up mt-4">
            {result.decision === "REJECTED" ? (
              <div className="flex items-center gap-3 rounded-xl bg-rose-500/10 px-4 py-3">
                <XCircle className="size-5 text-rose-600" />
                <div>
                  <div className="text-sm font-semibold text-rose-600">
                    자동 반려됨
                  </div>
                  <div className="text-xs text-muted">
                    품질 기준 미달 · 이 지점은 재수집 가능
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-brand-500/10 px-4 py-3">
                {result.decision === "APPROVED" ? (
                  <CheckCircle2 className="size-5 text-brand-600" />
                ) : (
                  <Clock3 className="size-5 text-amber-600" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {result.decision === "APPROVED"
                      ? "자동 승인 · 데이터 채택"
                      : "수집 완료 · 검수 대기"}
                  </div>
                  <div className="text-xs text-muted">
                    {result.decision === "APPROVED"
                      ? "기본 크레딧 + 성과 보너스 지급"
                      : "관리자 검수 후 성과 보너스 지급"}
                  </div>
                </div>
                <div className="font-num text-lg font-bold text-brand-700 dark:text-brand-300">
                  +{formatWon(reward)}
                </div>
              </div>
            )}
            <button
              onClick={onDone}
              className="mt-3 w-full rounded-xl bg-surface-2 py-2.5 text-sm font-semibold"
            >
              계속 달리기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
