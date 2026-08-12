import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { BuildDatasetButton } from "./BuildDatasetButton";
import { DATA_TYPE_META } from "@/lib/constants";
import { relativeTime } from "@/lib/utils";
import { Package, CheckCircle2, Database, Layers, FileJson } from "lucide-react";

export default async function DatasetsPage() {
  await requireUser("ADMIN");

  const requests = await prisma.request.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { orgName: true, name: true } },
      datasets: { orderBy: { createdAt: "desc" } },
    },
  });

  const approved = await prisma.submission.findMany({
    where: { status: "APPROVED" },
    select: { mission: { select: { requestId: true } } },
  });
  const approvedByReq = new Map<string, number>();
  for (const s of approved) {
    const id = s.mission.requestId;
    approvedByReq.set(id, (approvedByReq.get(id) ?? 0) + 1);
  }

  const buildable = requests.filter((r) => (approvedByReq.get(r.id) ?? 0) > 0);
  const allDatasets = requests.flatMap((r) =>
    r.datasets.map((d) => ({ ...d, requestTitle: r.title }))
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">데이터셋 납품</h1>
        <p className="mt-1 text-muted">
          검수 완료 데이터를 표준 포맷으로 패키징해 의뢰사에 납품합니다.
        </p>
      </div>

      {/* 패키징 가능 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Layers className="size-5 text-brand-600" /> 패키징 대기
        </h2>
        {buildable.length === 0 ? (
          <div className="card py-12 text-center text-sm text-muted">
            승인 완료된 데이터가 쌓이면 여기서 데이터셋을 생성할 수 있습니다.
          </div>
        ) : (
          <div className="grid gap-3">
            {buildable.map((r) => {
              const cnt = approvedByReq.get(r.id) ?? 0;
              const meta = DATA_TYPE_META[r.dataType as keyof typeof DATA_TYPE_META];
              const latest = r.datasets[0];
              return (
                <div key={r.id} className="card flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <div className="mb-1.5 flex items-center gap-2">
                      <Badge tone="accent">{meta?.label}</Badge>
                      <span className="text-xs text-muted">
                        {r.client.orgName ?? r.client.name}
                      </span>
                    </div>
                    <h3 className="font-semibold">{r.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                      <CheckCircle2 className="size-4 text-brand-600" />
                      승인 데이터 {cnt}건 / 목표 {r.targetCount}건
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {latest && (
                      <Badge tone="brand" dot>
                        최신 v{r.datasets.length} 납품됨
                      </Badge>
                    )}
                    <BuildDatasetButton requestId={r.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 납품 내역 */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Database className="size-5 text-accent-600" /> 납품된 데이터셋
        </h2>
        {allDatasets.length === 0 ? (
          <div className="card py-12 text-center text-sm text-muted">
            아직 납품된 데이터셋이 없습니다.
          </div>
        ) : (
          <div className="grid gap-3">
            {allDatasets.map((d) => (
              <div key={d.id} className="card flex items-center gap-4 p-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent-500/12 text-accent-600">
                  <FileJson className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-sm text-muted">
                    {d.itemCount}개 항목 · RunData Standard v1 ·{" "}
                    {d.deliveredAt ? relativeTime(d.deliveredAt) : "생성 중"}
                  </div>
                </div>
                <Badge tone="brand" dot>
                  납품 완료
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
