import { cx } from "./cx";

type Tone = "neutral" | "accent" | "low" | "medium" | "high";

const tones: Record<Tone, string> = {
  neutral: "bg-[var(--border)] text-[var(--foreground)]",
  accent: "bg-[var(--nav-active-bg)] text-[var(--nav-active-fg)]",
  low: "bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]",
  medium: "bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]",
  high: "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
