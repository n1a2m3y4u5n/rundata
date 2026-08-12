import { requireUser } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Map } from "@/components/map/Map";
import { Stat, Progress } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { DATA_TYPE_META } from "@/lib/constants";
import { formatWon } from "@/lib/utils";
import { Target, MapPin, CheckCircle2, Wallet, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { MapMarker } from "@/components/map/types";
import { CollectedData, type DataItem } from "./CollectedData";

export default async function RequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser("CLIENT");
  const { id } = await params;

  const req = await prisma.request.findFirst({
    where: { id, clientId: user.id },
    include: {
      missions: true,
      _count: { select: { missions: true } },
    },
  });
  if (!req) notFound();

  const submissions = await prisma.submission.findMany({
    where: { mission: { requestId: req.id } },
    orderBy: { createdAt: "desc" },
    include: { runner: { select: { name: true } } },
  });

  const approved = submissions.filter((s) => s.status === "APPROVED").length;
  const pending = submissions.filter((s) => s.status === "PENDING").length;
  const meta = DATA_TYPE_META[req.dataType as keyof typeof DATA_TYPE_META];
  const pct = Math.min(100, (approved / req.targetCount) * 100);

  const items: DataItem[] = submissions.map((s) => {
    const regionCount = s.piiRegions
      ? (JSON.parse(s.piiRegions) as unknown[]).length
      : 0;
    return {
    id: s.id,
    // 개인정보 보호: 승인된 제출만, 그것도 마스킹본(maskedPhotoData)만 노출.
    // 원본 photoData는 어떤 상태에서도 클라이언트로 전달하지 않는다(검수 전 미마스킹 유출 방지).
    image: s.status === "APPROVED" ? s.maskedPhotoData : null,
    masked: regionCount > 0, // 실제 비식별 영역이 있을 때만 마스킹 표기(오표기 방지)
    runnerName: s.runner.name,
    capturedAt: s.capturedAt.toISOString(),
    lat: s.lat,
    lng: s.lng,
    gpsMatch: s.gpsMatch,
    distanceM: s.distanceM,
    autoReviewed: s.autoReviewed,
    qualityScore: s.qualityScore,
    labels: s.aiLabels ? (JSON.parse(s.aiLabels) as string[]) : [],
    observation: s.observationData
      ? (JSON.parse(s.observationData) as Record<string, number>)
      : null,
    status: s.status,
    dataType: req.dataType,
    };
  });

  const markers: MapMarker[] = [
    ...req.missions.map((m) => ({
      id: m.id,
      lat: m.lat,
      lng: m.lng,
      kind: "mission" as const,
      priority: m.priority,
      status: m.status,
    })),
    ...submissions.map((s) => ({
      id: `s-${s.id}`,
      lat: s.lat,
      lng: s.lng,
      kind: "submission" as const,
      status: s.status,
    })),
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/client"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> 대시보드
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="accent">{meta?.label}</Badge>
            <Badge tone={req.status === "ACTIVE" ? "brand" : "neutral"} dot>
              {req.status === "ACTIVE" ? "진행 중" : "완료"}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{req.title}</h1>
          <p className="mt-1.5 max-w-2xl text-muted">{req.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="목표 수집" value={req.targetCount} unit="건" icon={<Target className="size-4" />} tone="accent" />
        <Stat label="생성 미션" value={req._count.missions} unit="개" icon={<MapPin className="size-4" />} tone="brand" />
        <Stat label="승인 수집" value={approved} unit="건" icon={<CheckCircle2 className="size-4" />} tone="brand" />
        <Stat label="선입금" value={formatWon(req.prepayment)} icon={<Wallet className="size-4" />} />
      </div>

      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">수집 진행률</span>
          <span className="font-num tnum text-muted">
            {approved}/{req.targetCount} · 검수 대기 {pending}
          </span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium">
          <MapPin className="size-4 text-accent-600" /> 미션 분포 · 수집 지점
        </div>
        <div className="h-[380px] w-full">
          <Map
            center={{ lat: req.areaLat, lng: req.areaLng }}
            area={{ lat: req.areaLat, lng: req.areaLng, radius: req.areaRadius }}
            markers={markers}
            fitTo="area"
            className="rounded-none border-0"
          />
        </div>
      </div>

      <CollectedData items={items} requestTitle={req.title} />
    </div>
  );
}
