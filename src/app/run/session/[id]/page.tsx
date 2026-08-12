import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { SessionClient } from "./SessionClient";
import { SessionSummary } from "./SessionSummary";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("RUNNER");
  const { id } = await params;

  const session = await prisma.runSession.findFirst({
    where: { id, runnerId: user.id },
    include: {
      route: { include: { missions: true } },
      submissions: { select: { missionId: true } },
    },
  });
  if (!session || !session.route) notFound();

  // 이미 종료된 세션 → 요약
  if (session.endedAt) {
    const submissions = await prisma.submission.findMany({
      where: { runSessionId: session.id },
      include: { mission: true },
    });
    const rewards = await prisma.rewardTransaction.findMany({
      where: {
        runnerId: user.id,
        submissionId: { in: submissions.map((s) => s.id) },
      },
    });
    return (
      <SessionSummary
        session={{
          distance: session.distance,
          duration: session.duration,
          avgPace: session.avgPace,
          missionsCompleted: session.missionsCompleted,
          intervalCount: session.intervalCount,
        }}
        submissions={submissions.map((s) => ({
          id: s.id,
          instruction: s.mission.instruction,
          qualityScore: s.qualityScore,
          photoData: s.maskedPhotoData ?? s.photoData,
        }))}
        totalReward={rewards.reduce((a, r) => a + r.amount, 0)}
      />
    );
  }

  const doneMissionIds = new Set(session.submissions.map((s) => s.missionId));
  const polyline = JSON.parse(session.route.polyline) as [number, number][];

  return (
    <SessionClient
      sessionId={session.id}
      polyline={polyline}
      missions={session.route.missions.map((m) => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        instruction: m.instruction,
        dataType: m.dataType,
        reward: m.reward,
        priority: m.priority,
        done: doneMissionIds.has(m.id),
      }))}
      avgSpeed={user.avgSpeed}
      distanceTarget={session.route.targetDistance}
    />
  );
}
