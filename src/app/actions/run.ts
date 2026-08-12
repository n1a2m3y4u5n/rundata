"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assessSubmission, autoLabel, REVIEW } from "@/lib/engines/refinement";
import {
  analyzeImage,
  type VisionResult,
  type PiiRegion,
} from "@/lib/engines/vision";
import { detectFaces } from "@/lib/engines/faces";
import { applyApproval } from "@/lib/review";

export type StartSessionPayload = {
  polyline: [number, number][];
  distance: number;
  estDuration: number;
  targetTime: number;
  targetDistance: number;
  workoutScore: number;
  missionScore: number;
  safetyScore: number;
  missionIds: string[];
};

export async function startSession(
  payload: StartSessionPayload
): Promise<void> {
  const user = await requireUser("RUNNER");

  const route = await prisma.route.create({
    data: {
      runnerId: user.id,
      polyline: JSON.stringify(payload.polyline),
      distance: payload.distance,
      estDuration: payload.estDuration,
      targetTime: payload.targetTime,
      targetDistance: payload.targetDistance,
      workoutScore: payload.workoutScore,
      missionScore: payload.missionScore,
      safetyScore: payload.safetyScore,
      status: "ACTIVE",
      missions: { connect: payload.missionIds.map((id) => ({ id })) },
    },
  });

  const session = await prisma.runSession.create({
    data: { runnerId: user.id, routeId: route.id },
  });

  redirect(`/run/session/${session.id}`);
}

export type SubmitMissionPayload = {
  missionId: string;
  sessionId: string;
  photoData?: string;
  lat: number;
  lng: number;
  observationData?: Record<string, unknown>;
};

export type ReviewDecision = "APPROVED" | "PENDING" | "REJECTED";

export type SubmitMissionResult = {
  ok: boolean;
  decision: ReviewDecision;
  qualityScore: number;
  gpsMatch: boolean;
  distanceM: number;
  labels: string[];
  hasPhoto: boolean;
  masked: boolean;
  piiCount: number; // Claude Vision이 탐지한 개인정보 영역 수
  aiPowered: boolean; // 실제 Claude 분석 수행 여부
  baseCredit: number;
  bonus: number;
  error?: string;
};

const EMPTY_RESULT: SubmitMissionResult = {
  ok: false,
  decision: "PENDING",
  qualityScore: 0,
  gpsMatch: false,
  distanceM: 0,
  labels: [],
  hasPhoto: false,
  masked: false,
  piiCount: 0,
  aiPowered: false,
  baseCredit: 0,
  bonus: 0,
};

export async function submitMission(
  payload: SubmitMissionPayload
): Promise<SubmitMissionResult> {
  const user = await requireUser("RUNNER");

  const mission = await prisma.mission.findUnique({
    where: { id: payload.missionId },
  });
  if (!mission) return { ...EMPTY_RESULT, error: "미션을 찾을 수 없습니다." };
  // 이미 수집·완료된 미션 재제출 차단 (기본 크레딧 중복 지급 방지)
  if (mission.status !== "OPEN") {
    return { ...EMPTY_RESULT, error: "이미 수집이 완료된 미션입니다." };
  }

  // 알고리즘 자동 1차 평가 (GPS 일치·시각·이미지 유무)
  const assessment = assessSubmission({
    missionLat: mission.lat,
    missionLng: mission.lng,
    submissionLat: payload.lat,
    submissionLng: payload.lng,
    hasPhoto: !!payload.photoData,
    dataType: mission.dataType,
  });
  const hasPhoto = !!payload.photoData;

  // 라벨은 Claude Vision, 얼굴 마스킹은 전용 얼굴탐지(BlazeFace)로 병렬 처리.
  // 각각 실패 시 규칙기반 라벨 / 빈 영역으로 안전 저하한다.
  const [vision, faceBoxes]: [VisionResult, PiiRegion[]] = hasPhoto
    ? await Promise.all([
        analyzeImage(payload.photoData as string),
        detectFaces(payload.photoData as string),
      ])
    : [{ labels: [], piiRegions: [], aiPowered: false }, []];

  const labelArr =
    vision.aiPowered && vision.labels.length > 0
      ? vision.labels
      : autoLabel(mission.dataType, mission.instruction);
  const labels = JSON.stringify(labelArr);
  // 얼굴은 BlazeFace(정밀) + 번호판·기타 개인정보는 Claude 탐지 → 결합
  const nonFacePii = vision.piiRegions.filter((r) => !/face|얼굴/i.test(r.kind));
  const piiRegions = [...faceBoxes, ...nonFacePii];
  const piiCount = piiRegions.length;
  // 탐지가 실제로 수행됐는지(Claude 분석 성공 또는 얼굴탐지 가동). 미수행이면 null로 저장해
  // 승인 시 mask.ts의 폴백 마스킹이 동작하도록 한다(키 미설정·탐지엔진 실패 시 원본 무마스킹 납품 방지).
  const detectionRan = vision.aiPowered || faceBoxes.length > 0;
  const piiRegionsJson =
    hasPhoto && detectionRan ? JSON.stringify(piiRegions) : null;
  const willMask = piiCount > 0;

  // 자동 판정: 고품질 자동 승인 / 저품질 자동 반려 / 중간 사람 검수
  let decision: ReviewDecision;
  if (assessment.qualityScore >= REVIEW.AUTO_APPROVE_THRESHOLD)
    decision = "APPROVED";
  else if (assessment.qualityScore <= REVIEW.AUTO_REJECT_THRESHOLD)
    decision = "REJECTED";
  else decision = "PENDING";

  const base = {
    missionId: mission.id,
    runnerId: user.id,
    runSessionId: payload.sessionId,
    photoData: payload.photoData,
    lat: payload.lat,
    lng: payload.lng,
    observationData: payload.observationData
      ? JSON.stringify(payload.observationData)
      : null,
    qualityScore: assessment.qualityScore,
    gpsMatch: assessment.gpsMatch,
    distanceM: assessment.distanceM,
    aiLabels: labels,
    piiRegions: piiRegionsJson,
  };

  // 자동 반려: 크레딧 없이 기록, 미션은 OPEN 유지(재수집 가능)
  if (decision === "REJECTED") {
    await prisma.submission.create({
      data: {
        ...base,
        status: "REJECTED",
        autoReviewed: true,
        reviewedAt: new Date(),
        rejectionReason: "알고리즘 자동 반려 (품질 기준 미달)",
      },
    });
    return {
      ...EMPTY_RESULT,
      ok: true,
      decision: "REJECTED",
      qualityScore: assessment.qualityScore,
      gpsMatch: assessment.gpsMatch,
      distanceM: assessment.distanceM,
      labels: labelArr,
      hasPhoto,
      masked: false,
      piiCount,
      aiPowered: vision.aiPowered,
    };
  }

  // 승인/검수대기: 제출 생성 + 미션 완료 + 기본 크레딧
  const submission = await prisma.submission.create({
    data: {
      ...base,
      status: "PENDING",
      autoReviewed: decision === "APPROVED",
    },
  });
  await prisma.mission.update({
    where: { id: mission.id },
    data: { status: "COMPLETED" },
  });
  await prisma.runSession.update({
    where: { id: payload.sessionId },
    data: { missionsCompleted: { increment: 1 } },
  });

  const baseCredit = Math.round(mission.reward * 0.5);
  await prisma.rewardTransaction.create({
    data: {
      runnerId: user.id,
      submissionId: submission.id,
      type: "BASE_CREDIT",
      amount: baseCredit,
      description: "미션 완료 기본 크레딧",
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { creditBalance: { increment: baseCredit } },
  });

  // 자동 승인: 마스킹·성과보너스·배지·완료판정 (공통 헬퍼)
  let bonus = 0;
  if (decision === "APPROVED") {
    const res = await applyApproval(submission.id);
    bonus = res.bonus;
  }

  return {
    ok: true,
    decision,
    qualityScore: assessment.qualityScore,
    gpsMatch: assessment.gpsMatch,
    distanceM: assessment.distanceM,
    labels: labelArr,
    hasPhoto,
    masked: decision === "APPROVED" && willMask,
    piiCount,
    aiPowered: vision.aiPowered,
    baseCredit,
    bonus,
  };
}

// 교환 항목과 가격은 서버가 소유한다(클라이언트가 보낸 금액을 신뢰하지 않음).
const REDEEM_OPTIONS: Record<string, number> = {
  "카페 기프티콘": 4100,
  "편의점 상품권": 3000,
  "프리미엄 이용권": 9900,
};

export async function redeemCredit(
  item: string
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("RUNNER");
  const amount = REDEEM_OPTIONS[item];
  if (!amount || amount <= 0) {
    return { ok: false, error: "유효하지 않은 교환 항목입니다." };
  }
  if (user.creditBalance < amount) {
    return { ok: false, error: "크레딧이 부족합니다." };
  }
  await prisma.rewardTransaction.create({
    data: {
      runnerId: user.id,
      type: "REDEMPTION",
      amount: -amount,
      description: `${item} 교환`,
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { creditBalance: { decrement: amount } },
  });
  revalidatePath("/run/profile");
  revalidatePath("/run");
  return { ok: true };
}

export type FinishSessionPayload = {
  sessionId: string;
  trackPoints: [number, number, number][];
  distance: number;
  duration: number;
  avgPace: number;
  intervalCount: number;
};

export async function finishSession(
  payload: FinishSessionPayload
): Promise<void> {
  const user = await requireUser("RUNNER");

  const session = await prisma.runSession.findFirst({
    where: { id: payload.sessionId, runnerId: user.id },
  });
  if (!session) redirect("/run");

  await prisma.runSession.update({
    where: { id: payload.sessionId },
    data: {
      endedAt: new Date(),
      distance: payload.distance,
      duration: payload.duration,
      trackPoints: JSON.stringify(payload.trackPoints),
      avgPace: payload.avgPace,
      intervalCount: payload.intervalCount,
    },
  });

  if (session.routeId) {
    await prisma.route.update({
      where: { id: session.routeId },
      data: { status: "DONE" },
    });
  }

  // 누적 거리·체력 갱신 (환류 구조)
  const fitnessGain = Math.min(3, payload.distance / 2000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      totalDistance: { increment: payload.distance },
      fitnessLevel: { increment: fitnessGain },
    },
  });

  revalidatePath("/run");
  redirect(`/run/session/${payload.sessionId}`);
}
