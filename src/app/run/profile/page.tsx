import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/LogoutButton";
import { formatWon } from "@/lib/utils";
import { formatDistance } from "@/lib/geo";
import { relativeTime } from "@/lib/utils";
import { BADGE_META } from "@/lib/constants";
import { Progress } from "@/components/ui/Stat";
import { RedeemCard } from "./RedeemCard";
import { Wallet, TrendingUp, Award, ArrowDownRight, ArrowUpRight, Trophy, Medal } from "lucide-react";

export default async function ProfilePage() {
  const user = await requireUser("RUNNER");
  const [badges, rewards, runners, approvedSubs] = await Promise.all([
    prisma.badge.findMany({ where: { runnerId: user.id }, orderBy: { earnedAt: "desc" } }),
    prisma.rewardTransaction.findMany({
      where: { runnerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.user.findMany({
      where: { role: "RUNNER" },
      select: { id: true, name: true },
    }),
    prisma.submission.findMany({
      where: { status: "APPROVED" },
      select: { runnerId: true },
    }),
  ]);

  // 지역 기여 랭킹 (승인 데이터 수 기준)
  const contribution = new Map<string, number>();
  for (const s of approvedSubs)
    contribution.set(s.runnerId, (contribution.get(s.runnerId) ?? 0) + 1);
  const ranking = runners
    .map((r) => ({ id: r.id, name: r.name, count: contribution.get(r.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const myRank =
    runners
      .map((r) => ({ id: r.id, count: contribution.get(r.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .findIndex((r) => r.id === user.id) + 1;

  return (
    <div className="flex flex-col px-5 pb-6 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full brand-gradient text-xl font-bold text-white">
          {user.name.slice(-2)}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted">러너 · 누적 {formatDistance(user.totalDistance)}</p>
        </div>
        <LogoutButton compact />
      </div>

      {/* Fitness */}
      <div className="card mt-5 p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <TrendingUp className="size-4 text-brand-600" /> 체력 지수
          </span>
          <span className="font-num font-bold">{Math.round(user.fitnessLevel)}/100</span>
        </div>
        <Progress value={user.fitnessLevel} />
        <p className="mt-2 text-xs text-muted">
          러닝을 지속할수록 체력 지수가 오르고, 더 정교한 경로를 추천받아요.
        </p>
      </div>

      {/* Credit */}
      <div className="card mt-4 p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-medium text-muted">
            <Wallet className="size-4" /> 보유 크레딧
          </span>
        </div>
        <div className="mt-1 font-num text-3xl font-extrabold text-brand-700 dark:text-brand-300">
          {formatWon(user.creditBalance)}
        </div>

        <div className="mt-4 space-y-2">
          {rewards.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              아직 적립 내역이 없어요.
            </p>
          ) : (
            rewards.map((r) => (
              <div key={r.id} className="flex items-center gap-3">
                <div
                  className={
                    "flex size-8 items-center justify-center rounded-lg " +
                    (r.amount >= 0
                      ? "bg-brand-500/12 text-brand-600"
                      : "bg-rose-500/12 text-rose-600")
                  }
                >
                  {r.amount >= 0 ? (
                    <ArrowUpRight className="size-4" />
                  ) : (
                    <ArrowDownRight className="size-4" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{r.description}</div>
                  <div className="text-xs text-muted">{relativeTime(r.createdAt)}</div>
                </div>
                <div
                  className={
                    "font-num text-sm font-bold " +
                    (r.amount >= 0 ? "text-brand-600" : "text-rose-600")
                  }
                >
                  {r.amount >= 0 ? "+" : ""}
                  {formatWon(r.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Redeem */}
      <div className="mt-4">
        <RedeemCard balance={user.creditBalance} />
      </div>

      {/* Ranking */}
      <div className="card mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 font-semibold">
            <Trophy className="size-4 text-brand-600" /> 지역 기여 랭킹
          </h2>
          {myRank > 0 && (
            <span className="rounded-full bg-brand-500/12 px-2.5 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
              내 순위 {myRank}위
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {ranking.map((r, i) => {
            const isMe = r.id === user.id;
            return (
              <div
                key={r.id}
                className={
                  "flex items-center gap-3 rounded-xl px-3 py-2 " +
                  (isMe ? "bg-brand-500/[0.08]" : "")
                }
              >
                <div
                  className={
                    "flex size-7 items-center justify-center rounded-lg text-sm font-bold " +
                    (i === 0
                      ? "bg-amber-400/20 text-amber-600"
                      : i === 1
                      ? "bg-slate-300/25 text-slate-500"
                      : i === 2
                      ? "bg-orange-400/20 text-orange-600"
                      : "bg-surface-2 text-muted")
                  }
                >
                  {i < 3 ? <Medal className="size-4" /> : i + 1}
                </div>
                <div className="flex-1 text-sm font-medium">
                  {r.name}
                  {isMe && <span className="ml-1 text-xs text-brand-600">(나)</span>}
                </div>
                <div className="font-num text-sm font-semibold text-muted">
                  {r.count}건
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges */}
      <div className="mt-4">
        <h2 className="mb-2 flex items-center gap-1.5 font-semibold">
          <Award className="size-4 text-brand-600" /> 배지
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {Object.entries(BADGE_META).map(([key, meta]) => {
            const earned = badges.some((b) => b.type === key);
            return (
              <div
                key={key}
                className={
                  "card flex flex-col items-center gap-1 p-3 text-center " +
                  (earned ? "" : "opacity-40 grayscale")
                }
              >
                <span className="text-2xl">{meta.emoji}</span>
                <span className="text-xs font-semibold">{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
