import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "low" | "medium" | "high";

const tones: Record<Tone, string> = {
  neutral: "border-border bg-card text-muted-foreground",
  accent: "border-border bg-muted text-foreground",
  low: "border-transparent bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]",
  medium: "border-transparent bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]",
  high: "border-transparent bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]",
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
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
