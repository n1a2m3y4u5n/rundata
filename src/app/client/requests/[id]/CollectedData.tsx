"use client";

import { useMemo, useState } from "react";
import JSZip from "jszip";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ImageOff,
  X,
  MapPin,
  ShieldCheck,
  Gauge,
  Tag,
  Lock,
  Clock,
  User,
  Download,
  Star,
  Sparkles,
  Cpu,
  FileJson,
} from "lucide-react";

export type DataItem = {
  id: string;
  image: string | null;
  masked: boolean;
  runnerName: string;
  capturedAt: string;
  lat: number;
  lng: number;
  gpsMatch: boolean;
  distanceM: number;
  autoReviewed: boolean;
  qualityScore: number;
  labels: string[];
  observation: Record<string, number> | null;
  status: string;
  dataType: string;
};

const EXP_LABELS: Record<string, string> = {
  vibration: "진동/흔들림",
  comfort: "보행감",
  safety: "안전감",
};

const STATUS_META: Record<string, { label: string; tone: "success" | "warn" | "danger" }> = {
  APPROVED: { label: "승인", tone: "success" },
  PENDING: { label: "검수중", tone: "warn" },
  REJECTED: { label: "반려", tone: "danger" },
};

type Filter = "all" | "APPROVED" | "PENDING";

export function CollectedData({
  items,
  requestTitle,
}: {
  items: DataItem[];
  requestTitle: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<DataItem | null>(null);
  const [packing, setPacking] = useState(false);

  const approvedCount = items.filter((i) => i.status === "APPROVED").length;

  // 실제 납품 패키지(ZIP): 마스킹 이미지 + manifest.json
  async function downloadPackage() {
    setPacking(true);
    try {
      const approved = items.filter((i) => i.status === "APPROVED");
      const zip = new JSZip();
      const imgDir = zip.folder("images")!;
      const manifestItems = [];
      for (const it of approved) {
        const entry: Record<string, unknown> = {
          id: it.id,
          runner: it.runnerName,
          lat: it.lat,
          lng: it.lng,
          gpsVerified: it.gpsMatch,
          gpsDistanceM: it.distanceM,
          qualityScore: it.qualityScore,
          labels: it.labels,
          capturedAt: it.capturedAt,
          reviewMethod: it.autoReviewed ? "auto" : "manual",
        };
        if (it.image) {
          try {
            const res = await fetch(it.image);
            const blob = await res.blob();
            const fname = `${it.id}.jpg`;
            imgDir.file(fname, blob);
            entry.image = `images/${fname}`;
          } catch {
            /* 이미지 누락 시 메타데이터만 */
          }
        }
        if (it.observation) entry.observation = it.observation;
        manifestItems.push(entry);
      }
      const manifest = {
        dataset: `${requestTitle} 데이터셋`,
        format: "RunData Standard v1",
        exportedAt: new Date().toISOString(),
        itemCount: manifestItems.length,
        note: "이미지는 개인정보 마스킹 처리된 버전입니다.",
        items: manifestItems,
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${requestTitle.replace(/\s+/g, "_")}_dataset.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPacking(false);
    }
  }
  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.status === filter)),
    [items, filter]
  );

  function downloadDataset() {
    const approved = items.filter((i) => i.status === "APPROVED");
    const manifest = {
      request: requestTitle,
      format: "RunData Standard v1",
      exportedAt: new Date().toISOString(),
      itemCount: approved.length,
      items: approved.map((i) => ({
        id: i.id,
        lat: i.lat,
        lng: i.lng,
        gpsVerified: i.gpsMatch,
        gpsDistanceM: i.distanceM,
        qualityScore: i.qualityScore,
        labels: i.labels,
        capturedAt: i.capturedAt,
        piiMasked: i.masked,
        reviewMethod: i.autoReviewed ? "auto" : "manual",
        observation: i.observation ?? undefined,
      })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${requestTitle.replace(/\s+/g, "_")}_dataset.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">
          수집 데이터{" "}
          <span className="ml-1 text-sm font-normal text-muted">
            {items.length}건
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-surface-2 p-0.5 text-sm">
            {(
              [
                ["all", "전체"],
                ["APPROVED", "승인"],
                ["PENDING", "검수중"],
              ] as [Filter, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-medium transition-colors",
                  filter === v
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadDataset}
            disabled={approvedCount === 0}
          >
            <FileJson className="size-4" /> JSON
          </Button>
          <Button
            size="sm"
            onClick={downloadPackage}
            loading={packing}
            disabled={approvedCount === 0}
          >
            <Download className="size-4" /> 패키지(ZIP)
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-muted-2">
            <ImageOff className="size-6" />
          </div>
          <p className="text-sm font-medium">해당 데이터가 없습니다</p>
          <p className="text-xs text-muted">
            러너가 미션을 수행하면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="group overflow-hidden rounded-xl border border-border text-left transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg hover:shadow-black/[0.05]"
            >
              <div className="relative aspect-square bg-surface-2">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    className="size-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : item.observation ? (
                  <div className="flex size-full items-center justify-center">
                    <Star className="size-8 text-brand-500/40" />
                  </div>
                ) : (
                  <div className="flex size-full items-center justify-center text-muted-2">
                    <ImageOff className="size-6" />
                  </div>
                )}
                <div className="absolute left-1.5 top-1.5">
                  <Badge tone={STATUS_META[item.status]?.tone ?? "neutral"}>
                    {STATUS_META[item.status]?.label ?? item.status}
                  </Badge>
                </div>
                {item.masked && (
                  <div className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md bg-black/55 text-white">
                    <Lock className="size-3" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 px-2.5 py-2">
                <span className="flex items-center gap-1 truncate text-xs font-medium">
                  <User className="size-3 shrink-0 text-muted-2" />
                  {item.runnerName}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand-600">
                  <Gauge className="size-3" />
                  {item.qualityScore}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <DataModal item={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function DataModal({ item, onClose }: { item: DataItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fade-up relative z-10 max-h-[90dvh] w-full max-w-lg overflow-auto rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_META[item.status]?.tone ?? "neutral"} dot>
              {STATUS_META[item.status]?.label ?? item.status}
            </Badge>
            {item.masked && (
              <Badge tone="neutral">
                <Lock className="size-3" /> 개인정보 마스킹
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 이미지 / 체감 */}
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="max-h-[46dvh] w-full object-contain bg-surface-2" />
        ) : item.observation ? (
          <div className="space-y-3 p-5">
            {Object.entries(item.observation).map(([k, v]) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-muted">{EXP_LABELS[k] ?? k}</span>
                  <span className="font-num font-bold">{v}/5</span>
                </div>
                <div className="h-2 rounded-full bg-surface-inset">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(v / 5) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* 수집 정보 */}
        <div className="space-y-3 p-5 pb-4">
          <MetaRow icon={<User className="size-4" />} label="수집 러너">
            {item.runnerName}
          </MetaRow>
          <MetaRow icon={<Clock className="size-4" />} label="촬영 시각">
            {relativeTime(item.capturedAt)}
          </MetaRow>
          <MetaRow icon={<MapPin className="size-4" />} label="촬영 위치">
            <span className="font-num">
              {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
            </span>
          </MetaRow>
        </div>

        {/* 알고리즘 평가 */}
        <div className="space-y-3 border-t border-border bg-surface-2/40 p-5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-accent-600">
            <Sparkles className="size-4" /> 알고리즘 자동 평가
          </div>
          <MetaRow icon={<ShieldCheck className="size-4" />} label="위치 정합성">
            <span>
              미션 지점에서 <b className="font-num">{item.distanceM}m</b>
            </span>
            <Badge tone={item.gpsMatch ? "success" : "warn"} className="ml-2">
              {item.gpsMatch ? "검증됨" : "오차"}
            </Badge>
          </MetaRow>
          <MetaRow icon={<Gauge className="size-4" />} label="품질 점수">
            <span className="font-num font-bold">{item.qualityScore}</span>
            <span className="text-muted">/100</span>
          </MetaRow>
          {item.labels.length > 0 && (
            <MetaRow icon={<Tag className="size-4" />} label="AI 라벨">
              <div className="flex flex-wrap gap-1">
                {item.labels.map((l) => (
                  <span
                    key={l}
                    className="rounded-md bg-surface px-1.5 py-0.5 text-xs text-muted"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </MetaRow>
          )}
          <MetaRow icon={<Cpu className="size-4" />} label="검수 방식">
            {item.autoReviewed ? (
              <Badge tone={item.status === "APPROVED" ? "success" : "danger"}>
                <Sparkles className="size-3" />
                {item.status === "APPROVED"
                  ? "알고리즘 자동 승인"
                  : "알고리즘 자동 반려"}
              </Badge>
            ) : (
              <Badge tone="neutral">관리자 수동 검수</Badge>
            )}
          </MetaRow>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-muted">
        {icon}
        {label}
      </span>
      <span className="flex flex-1 flex-wrap items-center">{children}</span>
    </div>
  );
}
