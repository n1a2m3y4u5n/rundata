import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { Stat, Progress } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { DATA_TYPE_META } from "@/lib/constants";
import { formatWon, formatWonShort } from "@/lib/utils";
import {
  Plus,
  FileStack,
  CheckCircle2,
  Wallet,
  Target,
  MapPin,
  ArrowRight,
  Inbox,
} from "lucide-react";
import Link from "next/link";

export default async function ClientDashboard() {
  const user = await requireUser("CLIENT");

  const requests = await prisma.request.findMany({
    where: { clientId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { missions: true } } },
  });

  const subs = await prisma.submission.findMany({
    where: { mission: { request: { clientId: user.id } } },
    select: { status: true, mission: { select: { requestId: true } } },
  });

  const collected = new Map<string, { total: number; approved: number }>();
  for (const s of subs) {
    const id = s.mission.requestId;
    const cur = collected.get(id) ?? { total: 0, approved: 0 };
    cur.total += 1;
    if (s.status === "APPROVED") cur.approved += 1;
    collected.set(id, cur);
  }

  const totalReq = requests.length;
  const activeReq = requests.filter((r) => r.status === "ACTIVE").length;
  const totalPrepay = requests.reduce((s, r) => s + r.prepayment, 0);
  const totalCollected = subs.filter((s) => s.status === "APPROVED").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">데이터 의뢰 대시보드</h1>
          <p className="mt-1 text-muted">
            {user.orgName ?? user.name} · 등록한 의뢰의 수집 현황을 확인하세요.
          </p>
        </div>
        <ButtonLink href="/client/new">
          <Plus className="size-4" /> 새 의뢰 등록
        </ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="전체 의뢰" value={totalReq} unit="건" icon={<FileStack className="size-4" />} tone="accent" />
        <Stat label="진행 중" value={activeReq} unit="건" icon={<Target className="size-4" />} tone="brand" />
        <Stat label="승인 수집" value={totalCollected} unit="건" icon={<CheckCircle2 className="size-4" />} tone="brand" />
        <Stat label="총 선입금" value={formatWonShort(totalPrepay)} icon={<Wallet className="size-4" />} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">내 의뢰</h2>
        {requests.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
              <Inbox className="size-7" />
            </div>
            <div>
              <p className="font-semibold">아직 등록한 의뢰가 없습니다</p>
              <p className="text-sm text-muted">첫 데이터 의뢰를 등록해보세요.</p>
            </div>
            <ButtonLink href="/client/new" size="sm">
              <Plus className="size-4" /> 새 의뢰 등록
            </ButtonLink>
          </div>
        ) : (
          <div className="grid gap-3">
            {requests.map((r) => {
              const c = collected.get(r.id) ?? { total: 0, approved: 0 };
              const meta = DATA_TYPE_META[r.dataType as keyof typeof DATA_TYPE_META];
              const pct = Math.min(100, (c.approved / r.targetCount) * 100);
              return (
                <Link key={r.id} href={`/client/requests/${r.id}`}>
                  <div className="card group p-5 transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/[0.04]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <Badge tone="accent">{meta?.label}</Badge>
                          <Badge tone={r.status === "ACTIVE" ? "brand" : "neutral"} dot>
                            {r.status === "ACTIVE" ? "진행 중" : "완료"}
                          </Badge>
                        </div>
                        <h3 className="truncate font-semibold">{r.title}</h3>
                        <p className="mt-1 line-clamp-1 text-sm text-muted">
                          {r.description}
                        </p>
                      </div>
                      <ArrowRight className="size-5 shrink-0 text-muted-2 transition-transform group-hover:translate-x-0.5" />
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm">
                      <span className="text-muted">수집 진행</span>
                      <span className="font-num font-semibold tnum">
                        {c.approved}/{r.targetCount}
                      </span>
                      <span className="text-muted-2">
                        · 미션 {r._count.missions}개 · 항목당 {formatWon(r.rewardPerItem)}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
