import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/Logo";
import { formatWon, formatNumber } from "@/lib/utils";
import { formatDistance } from "@/lib/geo";
import {
  Play,
  Wallet,
  Activity,
  Route as RouteIcon,
  MapPin,
  Flame,
  ChevronRight,
  Camera,
} from "lucide-react";
import Link from "next/link";
import { relativeTime } from "@/lib/utils";

export default async function RunHome() {
  const user = await requireUser("RUNNER");

  const [openMissions, completedCount, recentSessions] = await Promise.all([
    prisma.mission.count({ where: { status: "OPEN" } }),
    prisma.submission.count({
      where: { runnerId: user.id, status: "APPROVED" },
    }),
    prisma.runSession.findMany({
      where: { runnerId: user.id, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 3,
    }),
  ]);

  return (
    <div className="flex flex-col pb-6">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5">
        <Logo size={24} />
        <Link
          href="/run/profile"
          className="flex size-9 items-center justify-center rounded-full brand-gradient text-sm font-bold text-white"
        >
          {user.name.slice(-2)}
        </Link>
      </div>

      <div className="px-5 pt-6">
        <p className="text-sm text-muted">안녕하세요</p>
        <h1 className="text-2xl font-bold tracking-tight">{user.name}님 🏃</h1>
      </div>

      {/* Credit hero */}
      <div className="px-5 pt-5">
        <div className="brand-gradient relative overflow-hidden rounded-3xl p-6 text-white">
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 text-sm text-white/80">
              <Wallet className="size-4" /> 보유 크레딧
            </div>
            <div className="mt-1 font-num text-4xl font-extrabold tracking-tight">
              {formatWon(user.creditBalance)}
            </div>
            <div className="mt-4 flex gap-5 text-sm">
              <div>
                <div className="text-white/70">누적 거리</div>
                <div className="font-num font-bold">
                  {formatDistance(user.totalDistance)}
                </div>
              </div>
              <div>
                <div className="text-white/70">체력 지수</div>
                <div className="font-num font-bold">
                  {Math.round(user.fitnessLevel)}
                </div>
              </div>
              <div>
                <div className="text-white/70">완료 미션</div>
                <div className="font-num font-bold">{completedCount}</div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10 blur-xl" />
          <Flame className="pointer-events-none absolute -bottom-4 -right-2 size-28 text-white/10" />
        </div>
      </div>

      {/* Start CTA */}
      <div className="px-5 pt-5">
        <ButtonLink href="/run/plan" size="lg" fullWidth className="h-14 text-base">
          <Play className="size-5 fill-current" /> 러닝 시작하기
        </ButtonLink>
      </div>

      {/* Nearby missions */}
      <div className="px-5 pt-6">
        <Link href="/run/plan">
          <div className="card flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/12 text-accent-600">
              <MapPin className="size-6" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">
                주변에 미션 {formatNumber(openMissions)}개 대기 중
              </div>
              <div className="text-sm text-muted">
                경로를 생성하고 데이터를 수집해보세요
              </div>
            </div>
            <ChevronRight className="size-5 text-muted-2" />
          </div>
        </Link>
      </div>

      {/* Recent activity */}
      <div className="px-5 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">최근 러닝</h2>
          <Link href="/run/history" className="text-sm text-brand-600">
            전체보기
          </Link>
        </div>
        {recentSessions.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-10 text-center">
            <RouteIcon className="size-7 text-muted-2" />
            <p className="text-sm font-medium">아직 러닝 기록이 없어요</p>
            <p className="text-xs text-muted">첫 러닝을 시작해보세요!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => (
              <div key={s.id} className="card flex items-center gap-4 p-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand-500/12 text-brand-600">
                  <Activity className="size-5" />
                </div>
                <div className="flex-1">
                  <div className="font-num font-semibold">
                    {formatDistance(s.distance)}
                  </div>
                  <div className="text-xs text-muted">
                    {relativeTime(s.startedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted">
                  <Camera className="size-4" />
                  {s.missionsCompleted}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
