"use client";

import { useActionState, useMemo, useState } from "react";
import { createRequest } from "@/app/actions/requests";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Fieldset, Label } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Map } from "@/components/map/Map";
import { orchestrate } from "@/lib/engines/orchestration";
import { DATA_TYPE_META, type DataType } from "@/lib/constants";
import { formatWon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  Camera,
  Eye,
  Star,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { MapMarker } from "@/components/map/types";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  IMAGE: Camera,
  OBSERVATION: Eye,
  EXPERIENCE: Star,
};

export function NewRequestForm({
  defaultCenter,
}: {
  defaultCenter: { lat: number; lng: number };
}) {
  const [state, action, pending] = useActionState(createRequest, undefined);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dataType, setDataType] = useState<DataType>("IMAGE");
  const [center, setCenter] = useState(defaultCenter);
  const [radius, setRadius] = useState(700);
  const [reward, setReward] = useState(300);
  const [count, setCount] = useState(30);

  const prepayment = reward * count;

  // 실시간 미션 변환 미리보기 (오케스트레이션 엔진)
  const previewMarkers: MapMarker[] = useMemo(() => {
    const specs = orchestrate({
      title: title || "미리보기",
      dataType,
      center,
      radiusM: radius,
      targetCount: count,
      rewardPerItem: reward,
    });
    return specs.map((s, i) => ({
      id: `p${i}`,
      lat: s.lat,
      lng: s.lng,
      kind: "mission" as const,
      priority: s.priority,
    }));
  }, [title, dataType, center, radius, count, reward]);

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      {/* 왼쪽: 입력 */}
      <div className="space-y-5">
        <div className="card space-y-5 p-6">
          <Fieldset label="사업/의뢰명" htmlFor="title">
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 온천동 일대 보도블록 파손 현황 수집"
              required
            />
          </Fieldset>
          <Fieldset label="설명" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="어떤 데이터를, 왜 수집하는지 설명해주세요."
              required
            />
          </Fieldset>

          <div>
            <Label>데이터 유형</Label>
            <input type="hidden" name="dataType" value={dataType} />
            <div className="grid grid-cols-3 gap-2.5">
              {(Object.keys(DATA_TYPE_META) as DataType[]).map((t) => {
                const Icon = TYPE_ICON[t];
                const meta = DATA_TYPE_META[t];
                const active = dataType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDataType(t)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all",
                      active
                        ? "border-accent-500 bg-accent-500/10"
                        : "border-border hover:bg-surface-2"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-5",
                        active ? "text-accent-600" : "text-muted"
                      )}
                    />
                    <span className="text-xs font-semibold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              {DATA_TYPE_META[dataType].desc}
            </p>
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <div>
            <Label hint={`${radius}m`}>수집 반경</Label>
            <input type="hidden" name="areaRadius" value={radius} />
            <input
              type="range"
              min={200}
              max={2000}
              step={100}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Fieldset label="항목당 단가" htmlFor="reward" hint="원">
              <Input
                id="reward"
                name="rewardPerItem"
                type="number"
                min={50}
                max={5000}
                step={50}
                value={reward}
                onChange={(e) => setReward(Number(e.target.value))}
              />
            </Fieldset>
            <Fieldset label="목표 수집 건수" htmlFor="count" hint="건">
              <Input
                id="count"
                name="targetCount"
                type="number"
                min={1}
                max={60}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </Fieldset>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-brand-500/[0.07] px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium text-muted">
              <Wallet className="size-4" /> 예상 선입금
            </span>
            <span className="font-num text-lg font-bold text-brand-700 dark:text-brand-300">
              {formatWon(prepayment)}
            </span>
          </div>
        </div>

        {state?.error && (
          <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-600 dark:text-rose-300">
            <AlertCircle className="size-4 shrink-0" />
            {state.error}
          </div>
        )}

        <input type="hidden" name="areaLat" value={center.lat} />
        <input type="hidden" name="areaLng" value={center.lng} />

        <Button type="submit" size="lg" fullWidth loading={pending}>
          <Sparkles className="size-4" /> 의뢰 등록 · 미션 자동 생성
        </Button>
      </div>

      {/* 오른쪽: 지도 + 미리보기 */}
      <div className="lg:sticky lg:top-24 lg:h-fit">
        <div className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="size-4 text-accent-600" /> 대상 지역 선택
            </span>
            <Badge tone="accent">
              <Sparkles className="size-3" /> 미션 {previewMarkers.length}개 미리보기
            </Badge>
          </div>
          <div className="h-[420px] w-full">
            <Map
              center={center}
              zoom={15}
              area={{ lat: center.lat, lng: center.lng, radius }}
              markers={previewMarkers}
              onClick={(lat, lng) => setCenter({ lat, lng })}
              className="rounded-none border-0"
            />
          </div>
          <p className="border-t border-border px-4 py-2.5 text-xs text-muted">
            지도를 클릭해 중심 지점을 지정하세요. 반경 안에 미션이 자동 배치됩니다.
          </p>
        </div>
      </div>
    </form>
  );
}
