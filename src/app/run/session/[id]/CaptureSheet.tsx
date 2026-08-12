"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatWon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Camera, ImagePlus, X, Wand2, MapPin, Check } from "lucide-react";
import { DATA_TYPE_META } from "@/lib/constants";

export type SheetMission = {
  id: string;
  instruction: string;
  dataType: string;
  reward: number;
  lat: number;
  lng: number;
};

const EXPERIENCE_QS = [
  { key: "vibration", label: "진동/흔들림", low: "심함", high: "안정적" },
  { key: "comfort", label: "보행감", low: "불편", high: "쾌적" },
  { key: "safety", label: "안전감", low: "불안", high: "안전" },
];

export function CaptureSheet({
  mission,
  onSubmit,
  onClose,
  submitting,
}: {
  mission: SheetMission;
  onSubmit: (data: {
    photoData?: string;
    observationData?: Record<string, number>;
  }) => void;
  onClose: () => void;
  submitting: boolean;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({
    vibration: 3,
    comfort: 3,
    safety: 3,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = DATA_TYPE_META[mission.dataType as keyof typeof DATA_TYPE_META];
  const isExperience = mission.dataType === "EXPERIENCE";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeToDataUrl(file, 720);
    setPhoto(dataUrl);
  }

  async function sampleShot() {
    // pedestrian=얼굴, vehicle=번호판 (제출 시 라이브 마스킹) — 마스킹 시연용
    const THEME_N: Record<string, number> = {
      pavement: 18,
      crack: 18,
      street: 12,
      pedestrian: 13,
      vehicle: 18,
      signage: 9,
    };
    const pools: Record<string, string[]> = {
      IMAGE: ["pavement", "crack", "pedestrian", "vehicle", "signage"],
      OBSERVATION: ["street"],
    };
    const themes =
      pools[mission.dataType] ??
      ["pavement", "crack", "pedestrian", "vehicle", "signage"];
    const theme = themes[Math.floor(Math.random() * themes.length)];
    const n = Math.floor(Math.random() * (THEME_N[theme] ?? 6)) + 1;
    const dataUrl = await urlToDataUrl(`/samples/${theme}/${n}.jpg`);
    if (dataUrl) setPhoto(dataUrl);
  }

  const canSubmit = isExperience || !!photo;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* 배경 탭으로는 닫지 않음 — 실수로 미션을 영구 스킵하는 것을 방지 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="fade-up relative z-10 flex max-h-[90dvh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-surface">
        {/* 헤더 (고정) */}
        <div className="shrink-0 px-5 pt-4">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border-strong" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <Badge tone="brand" dot>
                  미션 도착
                </Badge>
                <Badge tone="accent">{meta?.label}</Badge>
              </div>
              <h3 className="font-semibold leading-snug">
                {mission.instruction}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 본문 (스크롤 영역) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {isExperience ? (
            <div className="space-y-4">
              {EXPERIENCE_QS.map((q) => (
                <div key={q.key}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{q.label}</span>
                    <span className="font-num font-bold text-brand-600">
                      {ratings[q.key]}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={ratings[q.key]}
                    onChange={(e) =>
                      setRatings((r) => ({
                        ...r,
                        [q.key]: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-brand-500"
                  />
                  <div className="flex justify-between text-xs text-muted-2">
                    <span>{q.low}</span>
                    <span>{q.high}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div className="relative flex h-48 items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface-2 sm:h-56">
                {photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt="촬영"
                      className="size-full object-cover"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow">
                      <Check className="size-3.5" /> 촬영 완료
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-2">
                    <Camera className="size-8" />
                    <span className="text-sm">현장을 촬영해주세요</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[0.65rem] text-white">
                  <MapPin className="size-3" />
                  {mission.lat.toFixed(5)}, {mission.lng.toFixed(5)}
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onFile}
                className="hidden"
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="size-4" />{" "}
                  {photo ? "다시 촬영" : "카메라/파일"}
                </Button>
                <Button variant="outline" onClick={sampleShot}>
                  <Wand2 className="size-4" /> 샘플 촬영
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 (항상 표시) */}
        <div className="shrink-0 border-t border-border px-5 pb-6 pt-3">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-500/[0.07] px-4 py-2.5 text-sm">
            <span className="text-muted">완료 시 기본 보상</span>
            <span className="font-num font-bold text-brand-700 dark:text-brand-300">
              {formatWon(Math.round(mission.reward * 0.5))}
            </span>
          </div>
          <Button
            fullWidth
            size="lg"
            loading={submitting}
            disabled={!canSubmit}
            onClick={() =>
              onSubmit(
                isExperience
                  ? { observationData: ratings }
                  : { photoData: photo ?? undefined }
              )
            }
          >
            {canSubmit ? (
              <>
                <Check className="size-5" /> 제출하기
              </>
            ) : (
              "사진을 촬영해주세요"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** 파일을 지정 최대폭으로 리사이즈해 dataURL 반환 */
async function resizeToDataUrl(file: File, maxW: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxW / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** 실제 샘플 사진(public/samples)을 data URL로 변환 (데모용) */
async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("load fail"));
      img.src = url;
    });
    const scale = Math.min(1, 720 / img.width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}
