"use client";

import { useState, useTransition } from "react";
import { redeemCredit } from "@/app/actions/run";
import { formatWon } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Gift, Coffee, Crown, Check } from "lucide-react";

const OPTIONS = [
  { item: "카페 기프티콘", amount: 4100, icon: Coffee },
  { item: "편의점 상품권", amount: 3000, icon: Gift },
  { item: "프리미엄 이용권", amount: 9900, icon: Crown },
];

export function RedeemCard({ balance }: { balance: number }) {
  const [pending, start] = useTransition();
  const [doneItem, setDoneItem] = useState<string | null>(null);

  function redeem(item: string) {
    start(async () => {
      const res = await redeemCredit(item);
      if (res.ok) {
        setDoneItem(item);
        setTimeout(() => setDoneItem(null), 2500);
      }
    });
  }

  return (
    <div className="card p-5">
      <h2 className="mb-1 font-semibold">크레딧 사용</h2>
      <p className="mb-4 text-xs text-muted">
        적립한 크레딧을 원하는 혜택으로 교환하세요.
      </p>
      {doneItem && (
        <div className="mb-3 flex items-center gap-2 rounded-xl bg-brand-500/10 px-3 py-2 text-sm font-medium text-brand-600">
          <Check className="size-4" /> {doneItem} 교환 완료!
        </div>
      )}
      <div className="space-y-2">
        {OPTIONS.map((o) => {
          const affordable = balance >= o.amount;
          return (
            <button
              key={o.item}
              disabled={!affordable || pending}
              onClick={() => redeem(o.item)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
                affordable
                  ? "border-border hover:border-brand-500/50 hover:bg-surface-2"
                  : "border-border opacity-45"
              )}
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-500/12 text-brand-600">
                <o.icon className="size-4.5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">{o.item}</div>
                <div className="text-xs text-muted">{formatWon(o.amount)}</div>
              </div>
              <span className="text-xs font-semibold text-brand-600">
                {affordable ? "교환" : "부족"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
