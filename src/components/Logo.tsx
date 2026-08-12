import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect width="32" height="32" rx="9" fill="url(#rd-g)" />
        {/* 러닝 트랙/경로 */}
        <path
          d="M8 21c0-5 3.2-8.5 7.5-8.5 2.6 0 4 1.4 4 3.2 0 2-1.6 3-4 3.3"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity="0.95"
        />
        {/* 데이터 노드 */}
        <circle cx="8" cy="21" r="2.4" fill="#fff" />
        <circle cx="22" cy="11" r="2.4" fill="#fff" />
        <defs>
          <linearGradient id="rd-g" x1="0" y1="0" x2="32" y2="32">
            <stop stopColor="#059669" />
            <stop offset="0.55" stopColor="#10b981" />
            <stop offset="1" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <span className="text-lg font-bold tracking-tight">
        Run<span className="text-brand-600">Data</span>
      </span>
    </span>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="url(#rd-gm)" />
      <path
        d="M8 21c0-5 3.2-8.5 7.5-8.5 2.6 0 4 1.4 4 3.2 0 2-1.6 3-4 3.3"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="8" cy="21" r="2.4" fill="#fff" />
      <circle cx="22" cy="11" r="2.4" fill="#fff" />
      <defs>
        <linearGradient id="rd-gm" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#059669" />
          <stop offset="0.55" stopColor="#10b981" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
    </svg>
  );
}
