"use client";

import type { PolicyMode } from "@exam/shared";

type BrowserPolicyKey =
  | "fullscreen"
  | "tabSwitch"
  | "clipboard"
  | "externalApp"
  | "externalSearch"
  | "multiWindow";

const POLICIES: { key: BrowserPolicyKey; label: string }[] = [
  { key: "fullscreen", label: "Fullscreen" },
  { key: "tabSwitch", label: "Tab switch" },
  { key: "clipboard", label: "Clipboard" },
  { key: "externalApp", label: "External app" },
  { key: "externalSearch", label: "External search / Lens" },
  { key: "multiWindow", label: "Multi-window" },
];

export function PolicySelect({
  value,
  onChange,
  disabled,
}: {
  value: PolicyMode;
  onChange: (v: PolicyMode) => void;
  disabled?: boolean;
}) {
  const options: { v: PolicyMode; label: string }[] = [
    { v: "enforce", label: "Enforce" },
    { v: "allow_but_log", label: "Allow but log" },
  ];
  return (
    <div
      role="radiogroup"
      className="inline-flex rounded-xl border border-border p-0.5 text-sm"
    >
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={`min-h-9 rounded-[10px] px-3 font-medium disabled:cursor-not-allowed ${
            value === o.v
              ? "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--accent)]"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export { POLICIES };
