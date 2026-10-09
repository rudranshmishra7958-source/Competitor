"use client";

import type { PolicyMode } from "@exam/shared";

const POLICIES: { key: Exclude<keyof import("@exam/shared").ExamSecurityPolicy, "requireEndpointAgent" | "cameraOptional" | "randomizeQuestionOrder" | "randomizeOptionOrder">; label: string }[] = [
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
  return (
    <select
      className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as PolicyMode)}
    >
      <option value="enforce">Enforce</option>
      <option value="allow_but_log">Allow but log</option>
    </select>
  );
}

export { POLICIES };
