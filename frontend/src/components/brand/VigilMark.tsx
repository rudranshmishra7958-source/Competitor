import { cn } from "@/lib/utils";

/** One aperture blade, drawn pointing up from the lens; rotated around (0,0). */
export const BLADE = "M0 -26 C30 -52 58 -88 52 -132 C14 -116 -20 -74 0 -26 Z";

const FOUR = [
  { angle: 0, fill: "var(--foreground)", opacity: 1 },
  { angle: 90, fill: "var(--sage)", opacity: 1 },
  { angle: 180, fill: "var(--foreground)", opacity: 0.55 },
  { angle: 270, fill: "var(--sage-ink)", opacity: 0.85 },
];

/** The Vigil aperture mark: blades around a lens. Theme-aware through CSS variables. */
export function VigilMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="-140 -140 280 280"
      className={cn("size-7 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {FOUR.map((blade) => (
        <path
          key={blade.angle}
          d={BLADE}
          transform={`rotate(${blade.angle})`}
          fill={blade.fill}
          fillOpacity={blade.opacity}
        />
      ))}
      <circle r="30" fill="var(--background)" stroke="var(--foreground)" strokeWidth="6" />
      <circle r="11" fill="var(--sage)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <VigilMark />
      <span className="text-[17px] font-medium tracking-[-0.02em]">Vigil</span>
    </span>
  );
}
