"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { applyApproval } from "@/lib/review";
import { buildManifest, type DatasetItemInput } from "@/lib/dataset";
import { type PolicyStatus } from "@/lib/policy";
import { revalidatePath } from "next/cache";

export async function approveSubmission(
  submissionId: string
): Promise<{ ok: boolean; bonus?: number }> {
  await requireUser("ADMIN");

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!sub || sub.status !== "PENDING") return { ok: false };

  const res = await applyApproval(submissionId);

  revalidatePath("/admin");
  revalidatePath("/client");
  return { ok: res.ok, bonus: res.bonus };
}

export async function rejectSubmission(
  submissionId: string,
  reason: string
): Promise<{ ok: boolean }> {
  await requireUser("ADMIN");
  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
  });
  if (!sub || sub.status !== "PENDING") return { ok: false };

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: "REJECTED",
      rejectionReason: reason || "품질 기준 미달",
      reviewedAt: new Date(),
    },
  });
  // 미션은 다시 수집 가능하도록 오픈
  await prisma.mission.update({
    where: { id: sub.missionId },
    data: { status: "OPEN" },
  });

  // 제출 시 선지급된 기본 크레딧 회수 (반려 데이터에 보상이 남지 않도록)
  const baseTx = await prisma.rewardTransaction.findUnique({
    where: { submissionId: sub.id },
  });
  if (baseTx && baseTx.type === "BASE_CREDIT" && baseTx.amount > 0) {
    // 잔액 하한 보장 — 이미 크레딧을 소진한 경우 음수 잔액이 되지 않도록 회수액을 제한
    const runner = await prisma.user.findUnique({
      where: { id: sub.runnerId },
      select: { creditBalance: true },
    });
    const reclaim = Math.min(baseTx.amount, runner?.creditBalance ?? 0);
    if (reclaim > 0) {
      await prisma.user.update({
        where: { id: sub.runnerId },
        data: { creditBalance: { decrement: reclaim } },
      });
      await prisma.rewardTransaction.create({
        data: {
          runnerId: sub.runnerId,
          type: "REDEMPTION",
          amount: -reclaim,
          description: "반려로 기본 크레딧 회수",
        },
      });
    }
  }

  revalidatePath("/admin");
  revalidatePath("/run");
  return { ok: true };
}

/**
 * 정책 환류 상태 갱신.
 * 담당 부서의 처리 진행을 기록하면 제보한 러너의 "내 제보 처리 현황"에 반영된다.
 * 실운영에서는 지자체 행정 시스템과 연동될 지점이며, 현재는 수동 갱신이다.
 */
export async function updatePolicyStatus(
  submissionId: string,
  status: PolicyStatus,
  note?: string
): Promise<{ ok: boolean }> {
  await requireUser("ADMIN");

  const sub = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { id: true, status: true },
  });
  // 승인된 데이터만 행정에 전달되므로, 그 외에는 환류 상태를 두지 않는다.
  if (!sub || sub.status !== "APPROVED") return { ok: false };

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      policyStatus: status,
      policyNote: note?.trim() || null,
      policyUpdatedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/run/reports");
  return { ok: true };
}

export async function buildDataset(
  requestId: string
): Promise<{ ok: boolean; datasetId?: string }> {
  await requireUser("ADMIN");

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { client: { select: { name: true, orgName: true } } },
  });
  if (!request) return { ok: false };

  const approved = await prisma.submission.findMany({
    where: { mission: { requestId }, status: "APPROVED" },
    include: { runner: { select: { name: true } } },
  });
  if (approved.length === 0) return { ok: false };

  const items: DatasetItemInput[] = approved.map((s) => ({
    id: s.id,
    runnerName: s.runner.name,
    lat: s.lat,
    lng: s.lng,
    gpsMatch: s.gpsMatch,
    distanceM: s.distanceM,
    qualityScore: s.qualityScore,
    aiLabels: s.aiLabels ? (JSON.parse(s.aiLabels) as string[]) : [],
    capturedAt: s.capturedAt.toISOString(),
    autoReviewed: s.autoReviewed,
    image: s.maskedPhotoData ?? s.photoData,
    observation: s.observationData
      ? (JSON.parse(s.observationData) as Record<string, number>)
      : null,
  }));

  const manifest = buildManifest(
    {
      id: request.id,
      title: request.title,
      dataType: request.dataType,
      areaLat: request.areaLat,
      areaLng: request.areaLng,
      areaRadius: request.areaRadius,
      clientName: request.client.orgName ?? request.client.name,
    },
    items,
    new Date().toISOString()
  );

  const dataset = await prisma.dataset.create({
    data: {
      requestId,
      name: `${request.title} 데이터셋`,
      itemCount: approved.length,
      manifest: JSON.stringify(manifest),
      status: "DELIVERED",
      deliveredAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/client");
  return { ok: true, datasetId: dataset.id };
}
