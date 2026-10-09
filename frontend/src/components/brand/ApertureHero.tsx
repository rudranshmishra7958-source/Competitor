import { cn } from "@/lib/utils";
import { BLADE } from "./VigilMark";

const TONES = [
  { fill: "var(--foreground)", opacity: 0.9 },
  { fill: "var(--sage)", opacity: 0.95 },
  { fill: "var(--foreground)", opacity: 0.35 },
  { fill: "var(--lime)", opacity: 0.9 },
  { fill: "var(--sage-ink)", opacity: 0.75 },
  { fill: "var(--foreground)", opacity: 0.6 },
];

/** Outer ring: 12 overlapping blades. Inner ring: 8 smaller blades turning the other way. */
const OUTER = Array.from({ length: 12 }, (_, i) => ({ angle: i * 30, ...TONES[i % TONES.length] }));
const INNER = Array.from({ length: 8 }, (_, i) => ({ angle: i * 45 + 22.5, ...TONES[(i + 3) % TONES.length] }));

type Chip = { label: string; value: string; className: string };

const CHIPS: Chip[] = [
  { label: "Review priority", value: "52 · High", className: "left-[4%] top-[16%]" },
  { label: "Snapshot kept", value: "No video stored", className: "right-[3%] top-[8%]" },
  { label: "Endpoint agent", value: "Connected", className: "left-[10%] bottom-[10%]" },
  { label: "Evidence", value: "Corroborated", className: "right-[8%] bottom-[16%]" },
];

/** Landing/login artwork: the aperture with orbit lines and a few factual product chips. */
export function ApertureHero({ className, chips = true }: { className?: string; chips?: boolean }) {
  return (
    <div className={cn("relative mx-auto aspect-[16/9] w-full max-w-5xl", className)}>
      <svg viewBox="0 0 800 450" className="absolute inset-0 size-full" aria-hidden>
        <g fill="none" stroke="var(--foreground)" strokeOpacity="0.16" strokeWidth="1">
          <ellipse cx="400" cy="250" rx="370" ry="120" transform="rotate(-7 400 250)" />
          <ellipse
            cx="400"
            cy="250"
            rx="290"
            ry="92"
            transform="rotate(10 400 250)"
            strokeDasharray="2 8"
          />
        </g>
        <g transform="translate(400 250) scale(1.25)">
          <g className="aperture-spin">
            {OUTER.map((blade) => (
              <path
                key={blade.angle}
                d={BLADE}
                transform={`rotate(${blade.angle})`}
                fill={blade.fill}
                fillOpacity={blade.opacity}
                stroke="var(--background)"
                strokeWidth="1.5"
              />
            ))}
          </g>
          <g className="aperture-spin-reverse">
            {INNER.map((blade) => (
              <path
                key={blade.angle}
                d={BLADE}
                transform={`rotate(${blade.angle}) scale(0.58)`}
                fill={blade.fill}
                fillOpacity={blade.opacity}
                stroke="var(--background)"
                strokeWidth="2"
              />
            ))}
          </g>
          <circle r="27" fill="var(--background)" stroke="var(--foreground)" strokeOpacity="0.8" strokeWidth="1.2" />
          <circle r="10" fill="var(--sage)" />
          <circle r="3.5" fill="var(--background)" />
        </g>
      </svg>
      {chips
        ? CHIPS.map((chip, index) => (
            <div
              key={chip.label}
              className={cn(
                "float-y absolute hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-[var(--shadow-float)] sm:block",
                chip.className,
              )}
              style={{ animationDelay: `${index * 1.4}s` }}
            >
              <p className="text-xs text-muted-foreground">{chip.label}</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">{chip.value}</p>
            </div>
          ))
        : null}
    </div>
  );
}
