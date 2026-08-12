import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { PlanClient } from "./PlanClient";
import { DEMO_CENTER } from "@/lib/constants";
import { buildCoverageIndex, serializeCoverage } from "@/lib/engines/coverage";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PlanPage() {
  const user = await requireUser("RUNNER");

  const [missions, collected] = await Promise.all([
    prisma.mission.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        lat: true,
        lng: true,
        priority: true,
        reward: true,
        instruction: true,
        dataType: true,
      },
    }),
    // 커버리지 형평 가중치의 입력. 승인된 수집 이력만 "관측되었다"고 인정한다.
    prisma.submission.findMany({
      where: { status: "APPROVED" },
      select: { lat: true, lng: true, capturedAt: true },
    }),
  ]);

  const coverage = serializeCoverage(buildCoverageIndex(collected));

  return (
    <div className="flex flex-col pb-6">
      <div className="flex items-center gap-3 px-5 pt-5">
        <Link
          href="/run"
          className="flex size-9 items-center justify-center rounded-full bg-surface-2 text-muted"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-bold">러닝 계획</h1>
      </div>

      <PlanClient
        missions={missions}
        defaultCenter={DEMO_CENTER}
        avgSpeed={user.avgSpeed}
        fitnessLevel={user.fitnessLevel}
        coverage={coverage}
      />
    </div>
  );
}
