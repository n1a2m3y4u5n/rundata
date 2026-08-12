import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { Stat } from "@/components/ui/Stat";
import { DEMO_CENTER } from "@/lib/constants";
import {
  buildCoverageIndex,
  summarizeCoverage,
  coverageStats,
  GRID_SIZE_M,
  EQUITY_SATURATION_DAYS,
} from "@/lib/engines/coverage";
import { CoverageClient } from "./CoverageClient";
import { Grid3x3, EyeOff, Clock, Scale } from "lucide-react";

/** 커버리지 진단 반경(m) */
const SCAN_RADIUS_M = 1200;

export default async function CoveragePage() {
  await requireUser("ADMIN");

  const collected = await prisma.submission.findMany({
    where: { status: "APPROVED" },
    select: { lat: true, lng: true, capturedAt: true },
  });

  const index = buildCoverageIndex(collected);
  const cells = summarizeCoverage(index, DEMO_CENTER, SCAN_RADIUS_M);
  const stats = coverageStats(cells);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">커버리지 형평 진단</h1>
        <p className="mt-1 text-muted">
          어느 구역이 오래 관측되지 않았는지 확인합니다. 민원이 들어오지 않는
          구역은 위험이 없는 곳이 아니라, 아직 아무도 보지 않은 곳입니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="진단 격자"
          value={stats.totalCells}
          unit="칸"
          icon={<Grid3x3 className="size-4" />}
        />
        <Stat
          label="관측된 격자"
          value={`${stats.coverageRate}%`}
          icon={<Scale className="size-4" />}
          tone="brand"
        />
        <Stat
          label="한 번도 없음"
          value={stats.neverCells}
          unit="칸"
          icon={<EyeOff className="size-4" />}
          tone="accent"
        />
        <Stat
          label={`${EQUITY_SATURATION_DAYS}일 이상 방치`}
          value={stats.staleCells}
          unit="칸"
          icon={<Clock className="size-4" />}
        />
      </div>

      <CoverageClient
        center={DEMO_CENTER}
        cells={cells.map((c) => ({
          key: c.key,
          center: c.center,
          count: c.count,
          gapDays: Math.round(c.gapDays),
          staleness: c.staleness,
        }))}
        gridSizeM={GRID_SIZE_M}
      />

      <div className="rounded-xl bg-surface-2 px-5 py-4 text-sm leading-relaxed text-muted">
        <b className="text-foreground">이 지표를 쓰는 방법.</b> 붉은 격자는 최근{" "}
        {EQUITY_SATURATION_DAYS}일 이상 수집 기록이 없는 구역입니다. 경로 추천
        엔진은 이 구역의 미션에 최대 2.2배까지 가중치를 부여해, 데이터가 비어
        있는 곳이 러너에게 더 매력적인 코스가 되도록 만듭니다. 지방자치단체는 이
        지도를 그대로 우선 점검 구역 선정에 쓸 수 있습니다.
      </div>
    </div>
  );
}
