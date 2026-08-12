"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Footprints, History, User, MessageSquareReply } from "lucide-react";

const TABS = [
  { href: "/run", label: "홈", icon: Home, exact: true },
  { href: "/run/plan", label: "러닝", icon: Footprints },
  { href: "/run/reports", label: "제보", icon: MessageSquareReply },
  { href: "/run/history", label: "기록", icon: History },
  { href: "/run/profile", label: "프로필", icon: User },
];

export function RunnerNav() {
  const pathname = usePathname();
  // 러닝 세션 중에는 하단 탭 숨김
  if (pathname.startsWith("/run/session")) return null;

  return (
    <nav className="glass sticky bottom-0 z-40 border-t border-border">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {TABS.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.7rem] font-medium transition-colors",
                active ? "text-brand-600" : "text-muted-2 hover:text-muted"
              )}
            >
              <t.icon className={cn("size-5", active && "stroke-[2.5]")} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
