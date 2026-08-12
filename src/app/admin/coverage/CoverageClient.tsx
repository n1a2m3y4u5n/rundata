"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

export type CoverageCellView = {
  key: string;
  center: { lat: number; lng: number };
  count: number;
  gapDays: number;
  staleness: number;
};

const CoverageMap = dynamic(() => import("./CoverageMap"), {
  ssr: false,
  loading: () => (
    <div className="skeleton flex h-[420px] w-full items-center justify-center rounded-2xl text-sm text-muted">
      커버리지 지도 불러오는 중…
    </div>
  ),
});

export function CoverageClient({
  center,
  cells,
  gridSizeM,
}: {
  center: { lat: number; lng: number };
  cells: CoverageCellView[];
  gridSizeM: number;
}) {
  const [hover, setHover] = useState<CoverageCellView | null>(null);

  return (
    <div className="space-y-3">
      <div className="h-[420px] overflow-hidden rounded-2xl border border-border">
        <CoverageMap
          center={center}
          cells={cells}
          gridSizeM={gridSizeM}
          onHover={setHover}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-2">최근 관측</span>
          <span className="flex overflow-hidden rounded-full border border-border">
            {[0, 0.25, 0.5, 0.75, 1].map((s) => (
              <span
                key={s}
                className="h-3 w-8"
                style={{ background: stalenessColor(s) }}
              />
            ))}
          </span>
          <span className="text-muted-2">오래 방치</span>
        </div>

        <div className="text-muted">
          {hover ? (
            <span>
              격자 {hover.key} · 수집{" "}
              <b className="text-foreground">{hover.count}건</b> ·{" "}
              {hover.count === 0 ? (
                <b className="text-accent-600">관측 기록 없음</b>
              ) : (
                <>
                  마지막 수집{" "}
                  <b className="text-foreground">{hover.gapDays}일 전</b>
                </>
              )}
            </span>
          ) : (
            <span className="text-muted-2">
              격자 위에 마우스를 올리면 상세가 표시됩니다 · 한 칸 {gridSizeM}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** 초록(최근 관측) → 붉음(오래 방치) */
export function stalenessColor(staleness: number): string {
  const s = Math.max(0, Math.min(1, staleness));
  // hsl 150(brand green) → 8(red)
  const hue = 150 - s * 142;
  const light = 46 + s * 6;
  return `hsl(${hue} 70% ${light}%)`;
}
