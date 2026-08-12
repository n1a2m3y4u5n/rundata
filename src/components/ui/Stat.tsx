import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  unit,
  icon,
  tone = "default",
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "brand" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("card p-4", className)}>
      <div className="flex items-center gap-2 text-muted">
        {icon && (
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-lg",
              tone === "brand" && "bg-brand-500/12 text-brand-600",
              tone === "accent" && "bg-accent-500/12 text-accent-600",
              tone === "default" && "bg-surface-2 text-muted"
            )}
          >
            {icon}
          </span>
        )}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-num text-2xl font-bold tracking-tight text-foreground tnum">
          {value}
        </span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
    </div>
  );
}

export function Progress({
  value,
  tone = "brand",
  className,
}: {
  value: number; // 0~100
  tone?: "brand" | "accent" | "warn";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-surface-inset",
        className
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          tone === "brand" && "brand-gradient",
          tone === "accent" && "bg-accent-500",
          tone === "warn" && "bg-warn"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
