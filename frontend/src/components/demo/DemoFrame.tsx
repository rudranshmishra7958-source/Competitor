import type { SceneKind } from "@/lib/demo/scenarios";
import { cn } from "@/lib/utils";

/** Illustrated stand-in for a webcam still. Clearly a drawing, never a real person. */
export function DemoFrame({
  scene,
  className,
  crop,
}: {
  scene: SceneKind;
  className?: string;
  /** Fill a shorter box by cropping top and bottom instead of letterboxing. */
  crop?: boolean;
}) {
  const covered = scene === "covered";
  return (
    <svg
      viewBox="0 0 160 120"
      preserveAspectRatio={crop ? "xMidYMid slice" : undefined}
      className={cn("block w-full rounded-lg", className)}
      role="img"
      aria-label={`Illustrated camera frame: ${scene.replace("_", " ")}`}
    >
      <rect width="160" height="120" fill={covered ? "#050605" : "#20261f"} />
      {!covered ? (
        <>
          <rect x="0" y="92" width="160" height="28" fill="#3a3329" />
          <rect x="18" y="98" width="46" height="14" rx="2" fill="#e9e6dc" opacity="0.8" />
          <rect x="112" y="18" width="34" height="44" rx="2" fill="#2c332b" />
        </>
      ) : (
        <text x="80" y="64" textAnchor="middle" fontSize="10" fill="#6e766c">
          camera covered
        </text>
      )}
      {scene !== "away" && !covered ? (
        <g transform={scene === "looking_down" ? "translate(80 50) rotate(14)" : "translate(80 50)"}>
          <circle r="15" fill="#c9b8a0" />
          <path d="M-28 52 C-26 26 -14 18 0 18 C14 18 26 26 28 52 Z" fill="#5d6e55" />
        </g>
      ) : null}
      {scene === "away" ? (
        <path d="M58 92 L58 52 Q80 44 102 52 L102 92" fill="none" stroke="#56604f" strokeWidth="5" />
      ) : null}
      {scene === "two_people" ? (
        <g transform="translate(132 58)">
          <circle r="11" fill="#b9a68d" />
          <path d="M-20 34 C-18 16 -9 12 0 12 C9 12 18 16 20 34 Z" fill="#6f5f78" />
        </g>
      ) : null}
      {scene === "phone" ? (
        <g>
          <rect x="96" y="76" width="13" height="22" rx="2.5" fill="#101211" stroke="#d6705c" strokeWidth="1.5" />
          <rect x="91" y="72" width="23" height="30" rx="3" fill="none" stroke="#d6705c" strokeDasharray="3 2" />
        </g>
      ) : null}
      <text x="155" y="116" fontSize="6" textAnchor="end" fill="#9aa39a" opacity="0.8">
        illustration
      </text>
    </svg>
  );
}
