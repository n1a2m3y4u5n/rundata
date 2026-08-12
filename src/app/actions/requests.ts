"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import {
  orchestrate,
  computePrepayment,
  MAX_MISSIONS_PER_REQUEST,
} from "@/lib/engines/orchestration";
import { type DataType } from "@/lib/constants";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2, "사업명을 입력하세요"),
  description: z.string().min(5, "설명을 입력하세요"),
  dataType: z.enum(["IMAGE", "OBSERVATION", "EXPERIENCE"]),
  areaLat: z.coerce.number(),
  areaLng: z.coerce.number(),
  areaRadius: z.coerce.number().min(100).max(3000),
  rewardPerItem: z.coerce.number().min(50).max(5000),
  targetCount: z.coerce.number().min(1).max(MAX_MISSIONS_PER_REQUEST),
});

export type CreateRequestState = { error?: string };

export async function createRequest(
  _prev: CreateRequestState | undefined,
  formData: FormData
): Promise<CreateRequestState> {
  const user = await requireUser("CLIENT");

  const parsed = schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    dataType: formData.get("dataType"),
    areaLat: formData.get("areaLat"),
    areaLng: formData.get("areaLng"),
    areaRadius: formData.get("areaRadius"),
    rewardPerItem: formData.get("rewardPerItem"),
    targetCount: formData.get("targetCount"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인하세요." };
  }
  const d = parsed.data;

  if (!d.areaLat || !d.areaLng) {
    return { error: "지도에서 대상 지역을 선택하세요." };
  }

  const prepayment = computePrepayment(d.rewardPerItem, d.targetCount);

  const req = await prisma.request.create({
    data: {
      clientId: user.id,
      title: d.title,
      description: d.description,
      dataType: d.dataType,
      areaLat: d.areaLat,
      areaLng: d.areaLng,
      areaRadius: d.areaRadius,
      rewardPerItem: d.rewardPerItem,
      targetCount: d.targetCount,
      prepayment,
      status: "ACTIVE",
    },
  });

  const specs = orchestrate({
    title: d.title,
    dataType: d.dataType as DataType,
    center: { lat: d.areaLat, lng: d.areaLng },
    radiusM: d.areaRadius,
    targetCount: d.targetCount,
    rewardPerItem: d.rewardPerItem,
  });

  await prisma.mission.createMany({
    data: specs.map((s) => ({
      requestId: req.id,
      lat: s.lat,
      lng: s.lng,
      instruction: s.instruction,
      dataType: s.dataType,
      priority: s.priority,
      reward: s.reward,
      status: "OPEN",
    })),
  });

  revalidatePath("/client");
  redirect(`/client/requests/${req.id}`);
}
