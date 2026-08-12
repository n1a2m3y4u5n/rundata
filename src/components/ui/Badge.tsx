import { cn } from "@/lib/utils";

type Tone =
  | "brand"
  | "accent"
  | "neutral"
  | "success"
  | "warn"
  | "danger"
  | "info";

const tones: Record<Tone, string> = {
  brand: "bg-brand-500/12 text-brand-700 dark:text-brand-300 ring-brand-500/20",
  accent:
    "bg-accent-500/12 text-accent-600 dark:text-accent-300 ring-accent-500/20",
  neutral: "bg-surface-2 text-muted ring-border",
  success: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 ring-emerald-500/20",
  warn: "bg-amber-500/14 text-amber-700 dark:text-amber-300 ring-amber-500/25",
  danger: "bg-rose-500/12 text-rose-700 dark:text-rose-300 ring-rose-500/20",
  info: "bg-sky-500/12 text-sky-700 dark:text-sky-300 ring-sky-500/20",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  dot,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
