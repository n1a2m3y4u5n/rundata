import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { Stat } from "@/components/ui/Stat";
import { ReviewCard, type ReviewItem } from "./ReviewCard";
import {
  Inbox,
  CheckCircle2,
  ShieldCheck,
  Layers,
  ClipboardCheck,
} from "lucide-react";

export default async function AdminHome() {
  await requireUser("ADMIN");

  const [pendingSubs, approvedCount, rejectedCount, datasetCount] =
    await Promise.all([
      prisma.submission.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          runner: { select: { name: true } },
          mission: { select: { instruction: true, dataType: true, reward: true } },
        },
      }),
      prisma.submission.count({ where: { status: "APPROVED" } }),
      prisma.submission.count({ where: { status: "REJECTED" } }),
      prisma.dataset.count(),
    ]);

  const total = approvedCount + rejectedCount;
  const approvalRate = total ? Math.round((approvedCount / total) * 100) : 0;

  const items: ReviewItem[] = pendingSubs.map((s) => ({
    id: s.id,
    photoData: s.photoData,
    instruction: s.mission.instruction,
    dataType: s.mission.dataType,
    runnerName: s.runner.name,
    createdAt: s.createdAt.toISOString(),
    qualityScore: s.qualityScore,
    gpsMatch: s.gpsMatch,
    aiLabels: s.aiLabels ? (JSON.parse(s.aiLabels) as string[]) : [],
    observationData: s.observationData
      ? (JSON.parse(s.observationData) as Record<string, number>)
      : null,
    reward: s.mission.reward,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">데이터 검수 큐</h1>
        <p className="mt-1 text-muted">
          자동 정제(품질검사·마스킹·라벨링)를 거친 데이터를 최종 검수합니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="검수 대기" value={pendingSubs.length} unit="건" icon={<Inbox className="size-4" />} tone="accent" />
        <Stat label="승인 완료" value={approvedCount} unit="건" icon={<CheckCircle2 className="size-4" />} tone="brand" />
        <Stat label="승인율" value={`${approvalRate}%`} icon={<ShieldCheck className="size-4" />} tone="brand" />
        <Stat label="납품 데이터셋" value={datasetCount} unit="개" icon={<Layers className="size-4" />} />
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="size-5 text-brand-600" /> 검수 대기 목록
        </h2>
        {items.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
              <CheckCircle2 className="size-7" />
            </div>
            <div>
              <p className="font-semibold">검수할 데이터가 없습니다</p>
              <p className="text-sm text-muted">
                러너가 미션을 수행하면 여기에 표시됩니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
