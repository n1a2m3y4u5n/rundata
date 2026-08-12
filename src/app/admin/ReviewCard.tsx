"use client";

import { useState, useTransition } from "react";
import { approveSubmission, rejectSubmission } from "@/app/actions/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DATA_TYPE_META } from "@/lib/constants";
import { relativeTime, formatWon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  MapPin,
  ShieldCheck,
  Tag,
  Gauge,
  ImageOff,
  Lock,
  Clock,
  User,
} from "lucide-react";

export type ReviewItem = {
  id: string;
  photoData: string | null;
  instruction: string;
  dataType: string;
  runnerName: string;
  createdAt: string;
  qualityScore: number;
  gpsMatch: boolean;
  aiLabels: string[];
  observationData: Record<string, number> | null;
  reward: number;
};

const EXP_LABELS: Record<string, string> = {
  vibration: "진동/흔들림",
  comfort: "보행감",
  safety: "안전감",
};

export function ReviewCard({ item }: { item: ReviewItem }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState<null | "approved" | "rejected">(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const meta = DATA_TYPE_META[item.dataType as keyof typeof DATA_TYPE_META];

  function approve() {
    startTransition(async () => {
      const res = await approveSubmission(item.id);
      if (res.ok) setDone("approved");
    });
  }
  function reject() {
    startTransition(async () => {
      const res = await rejectSubmission(item.id, reason);
      if (res.ok) setDone("rejected");
    });
  }

  if (done) {
    return (
      <div
        className={cn(
          "card flex items-center gap-3 p-4 text-sm font-medium",
          done === "approved" ? "text-brand-600" : "text-rose-600"
        )}
      >
        {done === "approved" ? (
          <>
            <Check className="size-5" /> 승인 완료 · 마스킹·라벨링 적용 후 납품 대기
          </>
        ) : (
          <>
            <X className="size-5" /> 반려 처리됨
          </>
        )}
      </div>
    );
  }

  const quality = item.qualityScore;
  const qTone = quality >= 80 ? "success" : quality >= 50 ? "warn" : "danger";

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex flex-col sm:flex-row">
        {/* 이미지 / 체감 */}
        <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-2 sm:w-56">
          {item.photoData ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoData} alt="" className="size-full object-cover" />
          ) : item.observationData ? (
            <div className="flex size-full flex-col justify-center gap-2 p-4">
              {Object.entries(item.observationData).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">{EXP_LABELS[k] ?? k}</span>
                    <span className="font-num font-bold">{v}/5</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-inset">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${(v / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex size-full items-center justify-center text-muted-2">
              <ImageOff className="size-6" />
            </div>
          )}
        </div>

        {/* 상세 + 파이프라인 */}
        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone="accent">{meta?.label}</Badge>
            <span className="flex items-center gap-1 text-xs text-muted">
              <User className="size-3" /> {item.runnerName}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-2">
              <Clock className="size-3" /> {relativeTime(item.createdAt)}
            </span>
          </div>
          <p className="text-sm font-medium">{item.instruction}</p>

          {/* 자동 정제 결과 */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge tone={qTone}>
              <Gauge className="size-3" /> 품질 {quality}
            </Badge>
            <Badge tone={item.gpsMatch ? "success" : "danger"}>
              <MapPin className="size-3" /> {item.gpsMatch ? "위치 검증" : "위치 오차"}
            </Badge>
            <Badge tone="neutral">
              <Lock className="size-3" /> 마스킹 예정
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Tag className="size-3.5 text-muted-2" />
            {item.aiLabels.slice(0, 6).map((l) => (
              <span
                key={l}
                className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.7rem] text-muted"
              >
                {l}
              </span>
            ))}
          </div>

          {/* 액션 */}
          <div className="mt-auto pt-4">
            {rejecting ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="반려 사유 (선택)"
                  className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus:border-brand-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={reject} loading={pending}>
                    반려 확정
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" onClick={approve} loading={pending} className="flex-1">
                  <Check className="size-4" /> 승인 · {formatWon(Math.round((item.reward * item.qualityScore) / 100 * 0.5))} 보너스
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejecting(true)}
                >
                  <X className="size-4" /> 반려
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
