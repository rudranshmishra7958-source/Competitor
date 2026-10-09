import type { RiskLevel } from "@exam/shared";

const styles: Record<RiskLevel, string> = {
  low: "bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]",
  medium: "bg-[var(--risk-medium-bg)] text-[var(--risk-medium-fg)]",
  high: "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]",
};

const labels: Record<RiskLevel, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function RiskChip({ level }: { level: RiskLevel }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}
