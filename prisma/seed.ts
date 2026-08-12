import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { hashPassword } from "../src/lib/password";
import { orchestrate, computePrepayment } from "../src/lib/engines/orchestration";
import { autoLabel } from "../src/lib/engines/refinement";
import { buildManifest, type DatasetItemInput } from "../src/lib/dataset";
import { DEMO_CENTER } from "../src/lib/constants";
import type { DataType } from "../src/lib/constants";
import { destination } from "../src/lib/geo";
import { readFileSync, existsSync } from "fs";

// 실제 현장 사진 (CC 라이선스, public/samples).
const THEME_PHOTO_COUNT: Record<string, number> = {
  pavement: 18,
  crack: 18,
  sign: 18,
  street: 12,
  river: 12,
  facility: 12,
  pedestrian: 13, // BlazeFace 얼굴탐지로 실제 블러 비식별화된 보행자 사진
  vehicle: 18, // Claude 번호판 탐지로 실제 블러 비식별화된 차량 사진
  signage: 9, // Claude 개인텍스트(이름표·주소) 탐지로 블러 비식별화된 표지물 사진
};

// 실제 탐지·마스킹 메타 (pedestrian=얼굴/BlazeFace, vehicle=번호판/Claude)
type RegionMeta = {
  labels: string[];
  faceCount: number;
  faces: { x: number; y: number; w: number; h: number; kind: string }[];
};
const THEME_META: Record<string, RegionMeta[]> = {};
for (const t of ["pedestrian", "vehicle", "signage"]) {
  const p = `public/samples/${t}-meta.json`;
  if (existsSync(p)) THEME_META[t] = JSON.parse(readFileSync(p, "utf8"));
}
function metaFor(theme: string | undefined, i: number): RegionMeta | null {
  const m = theme ? THEME_META[theme] : null;
  return m && m.length ? m[i % m.length] : null;
}
function samplePhoto(theme: string, i: number): string {
  const n = THEME_PHOTO_COUNT[theme] ?? 6;
  return `/samples/${theme}/${(i % n) + 1}.jpg`;
}
function sampleMasked(theme: string, i: number): string {
  const n = THEME_PHOTO_COUNT[theme] ?? 6;
  return `/samples/${theme}/${(i % n) + 1}-masked.jpg`;
}

const adapter = new PrismaBetterSqlite3({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const PW = hashPassword("demo1234");

async function main() {
  console.log("🌱 기존 데이터 초기화...");
  await prisma.rewardTransaction.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.runSession.deleteMany();
  await prisma.route.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.dataset.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.request.deleteMany();
  await prisma.user.deleteMany();

  console.log("👤 사용자 생성...");
  const admin = await prisma.user.create({
    data: {
      email: "admin@rundata.kr",
      password: PW,
      name: "운영관리자",
      role: "ADMIN",
    },
  });

  const asan = await prisma.user.create({
    data: {
      email: "asan@rundata.kr",
      password: PW,
      name: "아산시 스마트도시과",
      role: "CLIENT",
      orgName: "아산시청",
    },
  });

  const kcs = await prisma.user.create({
    data: {
      email: "safety@rundata.kr",
      password: PW,
      name: "한국건설안전연구원",
      role: "CLIENT",
      orgName: "한국건설안전연구원",
    },
  });

  const env = await prisma.user.create({
    data: {
      email: "env@rundata.kr",
      password: PW,
      name: "한국환경공단 모니터링팀",
      role: "CLIENT",
      orgName: "한국환경공단",
    },
  });

  const traffic = await prisma.user.create({
    data: {
      email: "traffic@rundata.kr",
      password: PW,
      name: "도로교통공단 안전본부",
      role: "CLIENT",
      orgName: "도로교통공단",
    },
  });

  const aivision = await prisma.user.create({
    data: {
      email: "aivision@rundata.kr",
      password: PW,
      name: "비전AI 데이터팀",
      role: "CLIENT",
      orgName: "비전AI",
    },
  });

  // 신청자 본인을 대표 러너로
  const namyunsu = await prisma.user.create({
    data: {
      email: "namyunsu1001@naver.com",
      password: PW,
      name: "남윤수",
      role: "RUNNER",
      avgSpeed: 2.9,
      totalDistance: 182000,
      fitnessLevel: 72,
      creditBalance: 48200,
    },
  });

  const otherRunners = await Promise.all(
    [
      { name: "김도현", email: "runner2@rundata.kr", fit: 65, dist: 240000, cred: 61000, spd: 3.1 },
      { name: "이서연", email: "runner3@rundata.kr", fit: 58, dist: 96000, cred: 27400, spd: 2.6 },
      { name: "박준영", email: "runner4@rundata.kr", fit: 80, dist: 410000, cred: 88900, spd: 3.4 },
      { name: "최민지", email: "runner5@rundata.kr", fit: 44, dist: 38000, cred: 12100, spd: 2.4 },
      { name: "정하늘", email: "runner6@rundata.kr", fit: 71, dist: 305000, cred: 74300, spd: 3.2 },
      { name: "강수빈", email: "runner7@rundata.kr", fit: 52, dist: 61000, cred: 19800, spd: 2.5 },
      { name: "윤재우", email: "runner8@rundata.kr", fit: 68, dist: 198000, cred: 53600, spd: 3.0 },
      { name: "한지민", email: "runner9@rundata.kr", fit: 61, dist: 142000, cred: 41200, spd: 2.8 },
      { name: "오세훈", email: "runner10@rundata.kr", fit: 76, dist: 358000, cred: 82100, spd: 3.3 },
    ].map((r) =>
      prisma.user.create({
        data: {
          email: r.email,
          password: PW,
          name: r.name,
          role: "RUNNER",
          avgSpeed: r.spd,
          totalDistance: r.dist,
          fitnessLevel: r.fit,
          creditBalance: r.cred,
        },
      })
    )
  );

  console.log("📋 의뢰 + 미션 생성...");
  const c = DEMO_CENTER;
  const allRunners = [namyunsu, ...otherRunners];
  const requestDefs: {
    client: string;
    title: string;
    description: string;
    dataType: DataType;
    center: { lat: number; lng: number };
    radius: number;
    reward: number;
    count: number;
    collect: number; // 사전 생성 제출 수
    approved: number; // 그 중 승인 수
    deliver?: boolean; // 데이터셋 납품 여부
    theme?: string; // 실제 사진 주제 (pavement | crack | street)
  }[] = [
    {
      // 대표 사례. 다수 기초자치단체가 점자블록 현황 자료 자체를 보유하지 못한다는
      // 문제(인천 10개 군·구 중 5곳 "관련 자료 없음", 2026)에서 출발한 의뢰다.
      client: asan.id,
      title: "관내 횡단보도 점자블록 파손·오설치 전수 실태",
      description:
        "민원이 접수된 지점만이 아니라 관내 전 구역의 점자블록 상태를 파악하기 위한 수집입니다. 시각장애인 보행 안전 정책의 기초 자료로 사용됩니다.",
      dataType: "IMAGE",
      center: destination(c, 300, 600),
      radius: 1000,
      reward: 400,
      count: 22,
      collect: 19,
      approved: 17,
      deliver: true,
      theme: "pavement",
    },
    {
      client: asan.id,
      title: "온천동 일대 보도블록 파손 현황 수집",
      description:
        "보행 안전 정책 수립을 위해 보도블록 파손·들뜸 지점의 이미지를 수집합니다.",
      dataType: "IMAGE",
      center: c,
      radius: 900,
      reward: 300,
      count: 20,
      collect: 20,
      approved: 18,
      deliver: true,
      theme: "pavement",
    },
    {
      client: kcs.id,
      title: "노후 건축물 외벽 균열 이미지 데이터셋",
      description:
        "AI 안전점검 모델 학습을 위한 건물 외벽 균열 이미지. 지정 각도·거리 촬영 필요.",
      dataType: "IMAGE",
      center: destination(c, 60, 700),
      radius: 700,
      reward: 500,
      count: 18,
      collect: 16,
      approved: 15,
      deliver: true,
      theme: "crack",
    },
    {
      client: aivision.id,
      title: "자율주행 학습용 도로표지·노면표시 수집",
      description:
        "자율주행 인식 모델 학습을 위한 도로표지판·노면표시 이미지. 위치·시점이 검증된 실세계 데이터.",
      dataType: "IMAGE",
      center: destination(c, 120, 500),
      radius: 950,
      reward: 450,
      count: 24,
      collect: 22,
      approved: 20,
      deliver: true,
      theme: "sign",
    },
    {
      client: traffic.id,
      title: "배방읍 자전거도로 노면 파손 점검",
      description:
        "자전거도로 노면의 균열·파손 지점을 촬영해 보수 우선순위를 산정하기 위한 데이터입니다.",
      dataType: "IMAGE",
      center: destination(c, 240, 900),
      radius: 700,
      reward: 350,
      count: 16,
      collect: 16,
      approved: 16,
      deliver: true,
      theme: "pavement",
    },
    {
      client: traffic.id,
      title: "횡단보도·보행자 통행 실태 관측 (개인정보 자동 마스킹)",
      description:
        "보행자 통행량·횡단보도 이용 실태를 수집합니다. 수집 중 함께 촬영된 보행자 얼굴은 AI 얼굴탐지(BlazeFace)로 자동 탐지·마스킹한 뒤 납품됩니다.",
      dataType: "IMAGE",
      center: destination(c, 200, 650),
      radius: 700,
      reward: 400,
      count: 16,
      collect: 14,
      approved: 12,
      deliver: true,
      theme: "pedestrian",
    },
    {
      client: traffic.id,
      title: "불법 주정차·차량 번호판 관측 (번호판 자동 마스킹)",
      description:
        "이면도로 불법 주정차 단속용 차량 관측 데이터. 촬영된 차량 번호판은 AI가 자동 탐지해 블러 비식별화한 뒤 납품됩니다.",
      dataType: "IMAGE",
      center: destination(c, 160, 550),
      radius: 650,
      reward: 350,
      count: 20,
      collect: 16,
      approved: 14,
      deliver: true,
      theme: "vehicle",
    },
    {
      client: asan.id,
      title: "생활 표지물·명패 실태 관측 (개인정보 텍스트 자동 마스킹)",
      description:
        "노후 우편함·현관 명패·주소판 등 생활 시설물 실태를 수집합니다. 이름·주소·전화번호 등 개인정보 텍스트는 AI가 자동 탐지해 블러 비식별화한 뒤 납품됩니다.",
      dataType: "IMAGE",
      center: destination(c, 80, 500),
      radius: 600,
      reward: 320,
      count: 14,
      collect: 9,
      approved: 9,
      deliver: true,
      theme: "signage",
    },
    {
      client: asan.id,
      title: "신정호 보행전용교 이용 적합성 체감 평가",
      description:
        "신설 보행교의 진동·보행감 등 체감 요소를 러너가 직접 통과 후 척도로 보고합니다.",
      dataType: "EXPERIENCE",
      center: destination(c, 300, 850),
      radius: 500,
      reward: 400,
      count: 20,
      collect: 16,
      approved: 12,
    },
    {
      client: env.id,
      title: "도시 방역용 해충 출현 분포 관찰",
      description:
        "방역 정책 수립을 위한 해충 발견 지점의 사진·위치 관찰 데이터를 수집합니다.",
      dataType: "OBSERVATION",
      center: destination(c, 180, 600),
      radius: 800,
      reward: 250,
      count: 35,
      collect: 18,
      approved: 12,
      theme: "street",
    },
    {
      client: env.id,
      title: "하천변 환경오염·투기 관찰",
      description:
        "하천 수변구역의 불법 투기·오염 지점을 러너가 관찰·기록해 환경 모니터링에 활용합니다.",
      dataType: "OBSERVATION",
      center: destination(c, 30, 1000),
      radius: 700,
      reward: 300,
      count: 25,
      collect: 18,
      approved: 13,
      theme: "river",
    },
    {
      client: asan.id,
      title: "근린공원 시설물 안전 점검",
      description:
        "공원 내 가로등·벤치·운동기구 등 시설물의 노후·파손 상태를 촬영해 점검합니다.",
      dataType: "IMAGE",
      center: destination(c, 340, 750),
      radius: 600,
      reward: 300,
      count: 25,
      collect: 18,
      approved: 12,
      theme: "facility",
    },
  ];

  let photoSeed = 1;
  for (const def of requestDefs) {
    const prepayment = computePrepayment(def.reward, def.count);
    const req = await prisma.request.create({
      data: {
        clientId: def.client,
        title: def.title,
        description: def.description,
        dataType: def.dataType,
        areaLat: def.center.lat,
        areaLng: def.center.lng,
        areaRadius: def.radius,
        rewardPerItem: def.reward,
        targetCount: def.count,
        prepayment,
        status: "ACTIVE",
      },
    });

    const specs = orchestrate({
      title: def.title,
      dataType: def.dataType,
      center: def.center,
      radiusM: def.radius,
      targetCount: def.count,
      rewardPerItem: def.reward,
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

    // 데모 활동: 제출·검수·보상 사전 생성
    const missions = await prisma.mission.findMany({
      where: { requestId: req.id },
      orderBy: { priority: "desc" },
      take: def.collect,
    });
    const isExp = def.dataType === "EXPERIENCE";
    for (let i = 0; i < missions.length; i++) {
      const m = missions[i];
      const runner = allRunners[(i + photoSeed) % allRunners.length];
      const isApproved = i < def.approved;
      const quality = isApproved ? 80 + ((i * 7) % 18) : 42 + ((i * 13) % 40);
      // pedestrian(얼굴)·vehicle(번호판) 테마는 실제 탐지 메타(라벨 + 마스킹 영역) 사용
      const tm = metaFor(def.theme, i);
      const labelsJson = tm
        ? JSON.stringify(tm.labels)
        : JSON.stringify(autoLabel(def.dataType, m.instruction));
      const piiRegionsJson = tm && !isExp ? JSON.stringify(tm.faces) : null;
      const sub = await prisma.submission.create({
        data: {
          missionId: m.id,
          runnerId: runner.id,
          photoData: isExp || !def.theme ? null : samplePhoto(def.theme, i),
          maskedPhotoData:
            isApproved && !isExp && def.theme
              ? sampleMasked(def.theme, i)
              : null,
          lat: m.lat + (Math.random() - 0.5) * 0.0003,
          lng: m.lng + (Math.random() - 0.5) * 0.0003,
          observationData: isExp
            ? JSON.stringify({
                vibration: 3 + (i % 3),
                comfort: 3 + (i % 2),
                safety: 4,
              })
            : null,
          status: isApproved ? "APPROVED" : "PENDING",
          qualityScore: quality,
          gpsMatch: true,
          distanceM: Math.round(6 + Math.random() * 28),
          autoReviewed: isApproved, // 고품질 자동 승인
          aiLabels: labelsJson,
          piiRegions: piiRegionsJson,
          reviewedAt: isApproved ? new Date() : null,
        },
      });
      await prisma.mission.update({
        where: { id: m.id },
        data: { status: isApproved ? "VERIFIED" : "COMPLETED" },
      });
      if (isApproved) {
        const base = Math.round(m.reward * 0.5);
        const bonus = Math.round(m.reward * (quality / 100) * 0.5);
        await prisma.rewardTransaction.createMany({
          data: [
            {
              runnerId: runner.id,
              submissionId: sub.id,
              type: "BASE_CREDIT",
              amount: base,
              description: "미션 완료 기본 크레딧",
            },
            {
              runnerId: runner.id,
              type: "PERFORMANCE_BONUS",
              amount: bonus,
              description: "데이터 채택 성과 보너스",
            },
          ],
        });
        await prisma.user.update({
          where: { id: runner.id },
          data: { creditBalance: { increment: base + bonus } },
        });
      }
      photoSeed++;
    }

    // 데이터셋 납품 (리치 매니페스트)
    if (def.deliver) {
      const approvedSubs = await prisma.submission.findMany({
        where: { mission: { requestId: req.id }, status: "APPROVED" },
        include: { runner: { select: { name: true } } },
      });
      const client = await prisma.user.findUnique({
        where: { id: def.client },
      });
      const items: DatasetItemInput[] = approvedSubs.map((s) => ({
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
          id: req.id,
          title: def.title,
          dataType: def.dataType,
          areaLat: def.center.lat,
          areaLng: def.center.lng,
          areaRadius: def.radius,
          clientName: client?.orgName ?? client?.name ?? "의뢰사",
        },
        items,
        new Date().toISOString()
      );
      await prisma.dataset.create({
        data: {
          requestId: req.id,
          name: `${def.title} 데이터셋`,
          itemCount: items.length,
          manifest: JSON.stringify(manifest),
          status: "DELIVERED",
          deliveredAt: new Date(),
        },
      });
    }

    console.log(
      `  · ${def.title} — 미션 ${specs.length}개 · 제출 ${missions.length}건(승인 ${def.approved})`
    );
  }

  // 남윤수 러닝 기록 2건
  const now = Date.now();
  await prisma.runSession.create({
    data: {
      runnerId: namyunsu.id,
      startedAt: new Date(now - 1000 * 60 * 60 * 26),
      endedAt: new Date(now - 1000 * 60 * 60 * 26 + 1000 * 1900),
      distance: 5180,
      duration: 1900,
      avgPace: 345,
      intervalCount: 9,
      missionsCompleted: 9,
      trackPoints: "[]",
    },
  });
  await prisma.runSession.create({
    data: {
      runnerId: namyunsu.id,
      startedAt: new Date(now - 1000 * 60 * 60 * 50),
      endedAt: new Date(now - 1000 * 60 * 60 * 50 + 1000 * 2400),
      distance: 6420,
      duration: 2400,
      avgPace: 352,
      intervalCount: 11,
      missionsCompleted: 11,
      trackPoints: "[]",
    },
  });

  // 대표 러너 배지 몇 개
  await prisma.badge.createMany({
    data: [
      { runnerId: namyunsu.id, type: "FIRST_MISSION" },
      { runnerId: namyunsu.id, type: "FIVE_MISSIONS" },
      { runnerId: namyunsu.id, type: "QUALITY_PRO" },
    ],
  });

  console.log("✅ 시드 완료");
  console.log(`   러너 로그인: namyunsu1001@naver.com / demo1234`);
  console.log(`   의뢰사 로그인: asan@rundata.kr / demo1234`);
  console.log(`   관리자 로그인: admin@rundata.kr / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
