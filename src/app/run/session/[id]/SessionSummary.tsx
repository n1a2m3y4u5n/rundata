import { ButtonLink } from "@/components/ui/Button";
import { formatDistance, formatDuration, formatPace } from "@/lib/geo";
import { formatWon } from "@/lib/utils";
import {
  Trophy,
  Route as RouteIcon,
  Clock,
  Gauge,
  Camera,
  Wallet,
  Home,
  ImageOff,
} from "lucide-react";

export function SessionSummary({
  session,
  submissions,
  totalReward,
}: {
  session: {
    distance: number;
    duration: number;
    avgPace: number;
    missionsCompleted: number;
    intervalCount: number;
  };
  submissions: { id: string; instruction: string; qualityScore: number; photoData: string | null }[];
  totalReward: number;
}) {
  return (
    <div className="flex flex-col px-5 pb-8 pt-8">
      {/* Celebration */}
      <div className="flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-full brand-gradient text-white shadow-xl shadow-brand-600/30">
          <Trophy className="size-10" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold">러닝 완료! 🎉</h1>
        <p className="mt-1 text-muted">
          데이터 {session.missionsCompleted}건을 수집했어요
        </p>
      </div>

      {/* Reward */}
      <div className="mt-6 brand-gradient rounded-3xl p-6 text-center text-white">
        <div className="flex items-center justify-center gap-1.5 text-sm text-white/80">
          <Wallet className="size-4" /> 이번 러닝 적립
        </div>
        <div className="mt-1 font-num text-4xl font-extrabold">
          +{formatWon(totalReward)}
        </div>
        <p className="mt-1 text-xs text-white/70">
          검수 승인 후 성과 보너스가 추가 지급됩니다
        </p>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <SummaryStat icon={<RouteIcon className="size-4" />} label="거리" value={formatDistance(session.distance)} />
        <SummaryStat icon={<Clock className="size-4" />} label="운동 시간" value={formatDuration(session.duration)} />
        <SummaryStat icon={<Gauge className="size-4" />} label="평균 페이스" value={`${formatPace(session.avgPace)}/km`} />
        <SummaryStat icon={<Camera className="size-4" />} label="완료 미션" value={`${session.missionsCompleted}건`} />
      </div>

      {/* Collected data */}
      {submissions.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 font-semibold">수집한 데이터</h2>
          <div className="grid grid-cols-3 gap-2">
            {submissions.map((s) => (
              <div
                key={s.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface-2"
              >
                {s.photoData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photoData} alt="" className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-2">
                    <ImageOff className="size-5" />
                  </div>
                )}
                <div className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[0.6rem] font-semibold text-white">
                  {s.qualityScore}점
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 space-y-2.5">
        <ButtonLink href="/run" fullWidth size="lg">
          <Home className="size-5" /> 홈으로
        </ButtonLink>
        <ButtonLink href="/run/history" fullWidth size="lg" variant="secondary">
          러닝 기록 보기
        </ButtonLink>
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-muted">
        <span className="flex size-7 items-center justify-center rounded-lg bg-surface-2">
          {icon}
        </span>
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-2 font-num text-xl font-bold">{value}</div>
    </div>
  );
}
