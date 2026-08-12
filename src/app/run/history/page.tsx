import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { formatDistance, formatDuration, formatPace } from "@/lib/geo";
import { relativeTime } from "@/lib/utils";
import { Activity, Camera, Clock, Route as RouteIcon } from "lucide-react";
import Link from "next/link";

export default async function HistoryPage() {
  const user = await requireUser("RUNNER");
  const sessions = await prisma.runSession.findMany({
    where: { runnerId: user.id, endedAt: { not: null } },
    orderBy: { startedAt: "desc" },
  });

  const totalDist = sessions.reduce((a, s) => a + s.distance, 0);
  const totalMissions = sessions.reduce((a, s) => a + s.missionsCompleted, 0);

  return (
    <div className="flex flex-col px-5 pb-6 pt-6">
      <h1 className="text-2xl font-bold tracking-tight">러닝 기록</h1>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="font-num text-xl font-bold">{sessions.length}</div>
          <div className="text-xs text-muted">총 러닝</div>
        </div>
        <div className="card p-4 text-center">
          <div className="font-num text-xl font-bold">
            {(totalDist / 1000).toFixed(1)}
          </div>
          <div className="text-xs text-muted">누적 km</div>
        </div>
        <div className="card p-4 text-center">
          <div className="font-num text-xl font-bold">{totalMissions}</div>
          <div className="text-xs text-muted">수집 데이터</div>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {sessions.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-12 text-center">
            <RouteIcon className="size-7 text-muted-2" />
            <p className="text-sm font-medium">아직 러닝 기록이 없어요</p>
          </div>
        ) : (
          sessions.map((s) => (
            <Link key={s.id} href={`/run/session/${s.id}`}>
              <div className="card flex items-center gap-4 p-4">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-500/12 text-brand-600">
                  <Activity className="size-6" />
                </div>
                <div className="flex-1">
                  <div className="font-num text-lg font-bold">
                    {formatDistance(s.distance)}
                  </div>
                  <div className="text-xs text-muted">
                    {relativeTime(s.startedAt)}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5" /> {formatDuration(s.duration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera className="size-3.5" /> {s.missionsCompleted}건
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
