import { cx } from "./cx";

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
      className={cx(
        "rounded-2xl p-5",
        strong ? "glass-strong" : "glass",
        interactive && "lift",
        className,
      )}
    />
  );
}

const toneClass = {
  low: "bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]",
  medium: "bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]",
  high: "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]",
};

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
  const cls = tone ? toneClass[tone] : "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]";
  return (
    <Card className="flex items-start gap-4">
      {icon ? (
        <span className={cx("grid size-11 shrink-0 place-items-center rounded-xl", cls)}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
      </div>
    </Card>
  );
}
