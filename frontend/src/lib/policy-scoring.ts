import type { ExamSecurityPolicy } from "@exam/shared";

/** Mirrors backend POLICY_EVENT_MAP in app/risk.py. */
export const POLICY_EVENT_MAP: Record<string, keyof ExamSecurityPolicy> = {
  visibility_hidden: "tabSwitch",
  window_blur: "multiWindow",
  fullscreen_exit: "fullscreen",
  clipboard_copy: "clipboard",
  clipboard_cut: "clipboard",
  clipboard_paste: "clipboard",
  contextmenu: "clipboard",
  devtools_open: "tabSwitch",
  navigation_away: "tabSwitch",
  process_blacklisted: "externalApp",
  foreground_app_changed: "externalApp",
  multiple_displays: "multiWindow",
  display_state_changed: "multiWindow",
  virtual_machine: "externalApp",
};

export const RULE_WEIGHTS: Record<string, number> = {
  visibility_hidden: 1,
  window_blur: 1,
  fullscreen_exit: 1,
  clipboard_copy: 1,
  clipboard_cut: 1,
  clipboard_paste: 2,
  contextmenu: 1,
  devtools_open: 3,
  navigation_away: 2,
  process_blacklisted: 5,
  multiple_displays: 2,
  virtual_machine: 2,
};

/** Mirrors backend ALLOWED_APPS: anything else in focus counts as another app. */
export const ALLOWED_APPS = new Set([
  "chrome.exe",
  "msedge.exe",
  "firefox.exe",
  "brave.exe",
  "opera.exe",
  "safari",
  "python.exe",
  "pythonw.exe",
  "py.exe",
  "explorer.exe",
  "lockapp.exe",
  "searchhost.exe",
  "shellexperiencehost.exe",
  "startmenuexperiencehost.exe",
]);

export type PolicyModeResult = "enforce" | "allow_but_log" | "ignore";

export function effectiveType(type: string, metadata: Record<string, unknown> = {}): string {
  if (type in RULE_WEIGHTS) return type;
  if (type === "foreground_app_changed") {
    const app = String(metadata.application ?? metadata.name ?? "").trim().toLowerCase();
    if (app && app !== "unknown" && !ALLOWED_APPS.has(app)) return "process_blacklisted";
  }
  if (type === "display_state_changed" && Number(metadata.count ?? 0) > 1) return "multiple_displays";
  return type;
}

export function policyMode(
  policy: ExamSecurityPolicy | Record<string, unknown>,
  eventType: string,
): PolicyModeResult {
  const withRules = policy as { rules?: Record<string, unknown> };
  const rules = withRules.rules ?? (policy as Record<string, unknown>);
  const category = POLICY_EVENT_MAP[eventType] ?? eventType;
  let value: unknown = rules[eventType] ?? rules[category] ?? "enforce";
  if (value && typeof value === "object") {
    const obj = value as { mode?: unknown; action?: unknown };
    value = obj.mode ?? obj.action ?? "enforce";
  }
  const text = String(value).toLowerCase();
  if (value === false || text === "off" || text === "disabled" || text === "ignore" || text === "false") {
    return "ignore";
  }
  if (text === "allow" || text === "allow_but_log" || text === "log" || text === "log_only") {
    return "allow_but_log";
  }
  return "enforce";
}

export function isScoredViolation(
  policy: ExamSecurityPolicy | Record<string, unknown>,
  type: string,
  metadata: Record<string, unknown> = {},
): boolean {
  const effective = effectiveType(type, metadata);
  return effective in RULE_WEIGHTS && policyMode(policy, effective) === "enforce";
}

export function violationPoints(type: string, metadata: Record<string, unknown> = {}): number {
  const effective = effectiveType(type, metadata);
  return RULE_WEIGHTS[effective] ?? 0;
}
