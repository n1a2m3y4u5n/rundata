"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { orchestrate, computePrepayment } from "@/lib/engines/orchestration";
import { hashPassword } from "@/lib/password";
import type { DataType } from "@/lib/constants";
import { revalidatePath } from "next/cache";

const DEMO_CLIENT_EMAIL = "field-demo@rundata.kr";
const DEMO_TITLE = "현장 데모 수집";
const TYPES: DataType[] = ["IMAGE", "OBSERVATION", "EXPERIENCE"];

/**
 * 현장 시연 대비: 러너의 현재 위치를 중심으로 데모 미션을 즉석 생성한다.
 * 심사장이 어디든 그 자리에서 미션을 확보해 전체 흐름을 시연할 수 있다.
 */
export async function generateDemoMissionsHere(
  lat: number,
  lng: number
): Promise<{ ok: boolean; count: number }> {
  await requireUser("RUNNER");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, count: 0 };
  }

  // 데모 전용 의뢰사 (없으면 생성)
  const demoClient = await prisma.user.upsert({
    where: { email: DEMO_CLIENT_EMAIL },
    create: {
      email: DEMO_CLIENT_EMAIL,
      password: hashPassword("demo1234"),
      name: "현장 데모",
      role: "CLIENT",
      orgName: "RunData 데모",
    },
    update: {},
  });

  // 이전 데모 요청 중 제출 없는 것 정리 (미션은 cascade 삭제)
  const oldReqs = await prisma.request.findMany({
    where: { clientId: demoClient.id, title: DEMO_TITLE },
    select: { id: true },
  });
  for (const r of oldReqs) {
    const subCount = await prisma.submission.count({
      where: { mission: { requestId: r.id } },
    });
    if (subCount === 0) await prisma.request.delete({ where: { id: r.id } });
  }

  // 유형별로 미션 생성 (지시문이 유형과 일치하도록)
  const radius = 450;
  const reward = 300;
  const perType = 14;
  const specsByType = TYPES.map((t) => ({
    t,
    specs: orchestrate({
      title: `${DEMO_TITLE}-${t}`,
      dataType: t,
      center: { lat, lng },
      radiusM: radius,
      targetCount: perType,
      rewardPerItem: reward,
    }),
  }));
  const total = specsByType.reduce((n, x) => n + x.specs.length, 0);

  const req = await prisma.request.create({
    data: {
      clientId: demoClient.id,
      title: DEMO_TITLE,
      description: "현장 시연을 위해 현재 위치 주변에 생성된 데모 미션입니다.",
      dataType: "IMAGE",
      areaLat: lat,
      areaLng: lng,
      areaRadius: radius,
      rewardPerItem: reward,
      targetCount: total,
      prepayment: computePrepayment(reward, total),
      status: "ACTIVE",
    },
  });

  await prisma.mission.createMany({
    data: specsByType.flatMap(({ t, specs }) =>
      specs.map((s) => ({
        requestId: req.id,
        lat: s.lat,
        lng: s.lng,
        instruction: s.instruction,
        dataType: t,
        priority: s.priority,
        reward: s.reward,
        status: "OPEN",
      }))
    ),
  });

  revalidatePath("/run/plan");
  return { ok: true, count: total };
}
