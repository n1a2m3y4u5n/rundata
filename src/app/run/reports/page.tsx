import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { relativeTime } from "@/lib/utils";
import {
  POLICY_STATUS_ORDER,
  policyMeta,
  policyStep,
} from "@/lib/policy";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, Inbox, Search, MapPin } from "lucide-react";

export default async function ReportsPage() {
  const user = await requireUser("RUNNER");

  const subs = await prisma.submission.findMany({
    where: { runnerId: user.id, status: "APPROVED" },
    orderBy: { capturedAt: "desc" },
    include: {
      mission: {
        select: {
          instruction: true,
          request: { select: { title: true, client: { select: { orgName: true, name: true } } } },
        },
      },
    },
  });

  const resolved = subs.filter((s) => s.policyStatus === "RESOLVED").length;
  const inspecting = subs.filter((s) => s.policyStatus === "INSPECTING").length;

  return (
    <div className="flex flex-col px-5 pb-6 pt-6">
      <h1 className="text-2xl font-bold tracking-tight">내 제보 처리 현황</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        당신이 수집한 데이터가 담당 부서에서 어떻게 처리되고 있는지 보여줍니다.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="font-num text-xl font-bold">{subs.length}</div>
          <div className="text-xs text-muted">전달된 제보</div>
        </div>
        <div className="card p-4 text-center">
          <div className="font-num text-xl font-bold text-sky-600">
            {inspecting}
          </div>
          <div className="text-xs text-muted">점검 중</div>
        </div>
        <div className="card p-4 text-center">
          <div className="font-num text-xl font-bold text-brand-600">
            {resolved}
          </div>
          <div className="text-xs text-muted">조치 완료</div>
        </div>
      </div>

      {resolved > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-brand-500/[0.09] px-4 py-3.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <p className="text-xs leading-relaxed text-muted">
            당신이 지나간 자리 <b className="text-foreground">{resolved}곳</b>이
            실제로 고쳐졌습니다.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-2.5">
        {subs.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="size-7 text-muted-2" />
            <p className="text-sm font-medium">아직 전달된 제보가 없어요</p>
            <p className="text-xs text-muted-2">
              러닝 중 미션을 수행하면 이곳에 처리 현황이 표시됩니다
            </p>
          </div>
        ) : (
          subs.map((s) => {
            const meta = policyMeta(s.policyStatus);
            const step = policyStep(s.policyStatus);
            const org =
              s.mission.request.client.orgName ?? s.mission.request.client.name;
            return (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {s.mission.request.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {s.mission.instruction}
                    </p>
                  </div>
                  <Badge tone={meta.tone} dot>
                    {meta.label}
                  </Badge>
                </div>

                {/* 진행 단계 */}
                <div className="mt-3.5 flex items-center gap-1.5">
                  {POLICY_STATUS_ORDER.map((st, i) => (
                    <div
                      key={st}
                      className={
                        "h-1.5 flex-1 rounded-full " +
                        (i <= step ? "bg-brand-500" : "bg-surface-2")
                      }
                    />
                  ))}
                </div>

                <p className="mt-2.5 text-xs text-muted">{meta.desc}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] text-muted-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {s.lat.toFixed(4)}, {s.lng.toFixed(4)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Search className="size-3" />
                    {org}
                  </span>
                  <span>{relativeTime(s.capturedAt)}</span>
                </div>

                {s.policyNote && (
                  <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs leading-relaxed text-muted">
                    담당 부서 회신 : {s.policyNote}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
