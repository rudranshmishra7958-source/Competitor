import { cn } from "@/lib/utils";

export function Card({
  className,
  strong,
  interactive,
  as: Tag = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  strong?: boolean;
  interactive?: boolean;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      {...rest}
      className={cn(
        "rounded-2xl border border-border bg-card p-5 text-card-foreground",
        strong && "shadow-[var(--shadow-float)]",
        interactive && "transition-colors hover:border-[var(--border-strong)]",
        className,
      )}
    />
  );
}

const toneDot = {
  low: "bg-[var(--risk-low-fg)]",
  medium: "bg-[var(--risk-medium-fg)]",
  high: "bg-[var(--risk-high-fg)]",
};

/** Label + large number. The optional icon is shown small beside the label, never as a tile. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "low" | "medium" | "high";
}) {
  return (
    <Card className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {tone ? <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden /> : null}
        {!tone && icon ? <span className="text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
        {label}
      </p>
      <p className="text-4xl font-medium tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
