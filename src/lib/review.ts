import "server-only";
import { prisma } from "./prisma";
import { maskImage } from "./engines/mask";
import type { PiiRegion } from "./engines/vision";

/**
 * 제출 승인 처리 (자동 검수·관리자 검수 공통):
 * 개인정보 마스킹 → 미션 검증 완료 → 성과 보너스 → 배지 → 요청 완료 판정.
 */
export async function applyApproval(
  submissionId: string
): Promise<{ ok: boolean; bonus: number }> {
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { mission: { include: { request: true } } },
  });
  if (!sub) return { ok: false, bonus: 0 };

  // 제출 시 Claude Vision이 탐지·저장한 개인정보 영역으로 정밀 마스킹.
  // piiRegions === null 이면 AI 미분석 → maskImage 폴백(고정영역)로 저하.
  const regions = parseRegions(sub.piiRegions);
  const masked = sub.photoData
    ? await maskImage(sub.photoData, regions)
    : null;

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: "APPROVED", maskedPhotoData: masked, reviewedAt: new Date() },
  });
  await prisma.mission.update({
    where: { id: sub.missionId },
    data: { status: "VERIFIED" },
  });

  const bonus = Math.round(sub.mission.reward * (sub.qualityScore / 100) * 0.5);
  await prisma.rewardTransaction.create({
    data: {
      runnerId: sub.runnerId,
      type: "PERFORMANCE_BONUS",
      amount: bonus,
      description: "데이터 채택 성과 보너스",
    },
  });
  await prisma.user.update({
    where: { id: sub.runnerId },
    data: { creditBalance: { increment: bonus } },
  });

  await grantBadges(sub.runnerId);
  await maybeCompleteRequest(
    sub.mission.requestId,
    sub.mission.request.targetCount
  );

  return { ok: true, bonus };
}

/** 저장된 piiRegions(JSON) 파싱 — null/파싱실패 시 undefined(폴백 마스킹) */
function parseRegions(raw: string | null): PiiRegion[] | undefined {
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as PiiRegion[]) : undefined;
  } catch {
    return undefined;
  }
}

export async function grantBadges(runnerId: string): Promise<void> {
  const count = await prisma.submission.count({
    where: { runnerId, status: "APPROVED" },
  });
  const grants: string[] = [];
  if (count >= 1) grants.push("FIRST_MISSION");
  if (count >= 5) grants.push("FIVE_MISSIONS");
  if (count >= 10) grants.push("QUALITY_PRO");
  for (const type of grants) {
    await prisma.badge.upsert({
      where: { runnerId_type: { runnerId, type } },
      create: { runnerId, type },
      update: {},
    });
  }
}

export async function maybeCompleteRequest(
  requestId: string,
  targetCount: number
): Promise<void> {
  const [approvedCount, missionCount] = await Promise.all([
    prisma.submission.count({
      where: { mission: { requestId }, status: "APPROVED" },
    }),
    prisma.mission.count({ where: { requestId } }),
  ]);
  const goal = Math.min(targetCount, missionCount);
  if (approvedCount >= goal) {
    await prisma.request.update({
      where: { id: requestId },
      data: { status: "COMPLETED" },
    });
  }
}
