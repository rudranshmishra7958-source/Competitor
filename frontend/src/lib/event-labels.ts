import { readApplicationName } from "@/lib/app-name";

const LABELS: Record<string, string> = {
  visibility_hidden: "Left the exam tab",
  visibility_visible: "Returned to the exam tab",
  window_blur: "Exam window lost focus",
  window_focus: "Exam window regained focus",
  fullscreen_enter: "Entered fullscreen",
  fullscreen_exit: "Left fullscreen",
  clipboard_copy: "Copied (event only, not the text)",
  clipboard_cut: "Cut (event only, not the text)",
  clipboard_paste: "Pasted (event only, not the text)",
  contextmenu: "Opened the right-click menu",
  devtools_open: "DevTools shortcut or window gap",
  navigation_away: "Left the exam page",
  submission_saved: "Answers submitted",
  agent_heartbeat: "Agent heartbeat",
  foreground_app_changed: "Foreground app changed (name only)",
  network_state_changed: "Network up or down",
  display_state_changed: "Display count changed",
  process_blacklisted: "Named prohibited app in front",
  multiple_displays: "More than one display",
  virtual_machine: "Virtual machine signal",
  session_locked: "Session locked",
  session_unlocked: "Session unlocked",
};

export function eventLabel(type: string): string {
  return LABELS[type] ?? type.replaceAll("_", " ");
}

export function eventLabelForAdmin(
  type: string,
  metadata?: Record<string, unknown>,
): string {
  const base = eventLabel(type);
  const name = readApplicationName(metadata);
  return name ? `${base} · ${name}` : base;
}

export function sourceLabel(source: string): string {
  if (source === "endpoint") return "Agent";
  if (source === "browser") return "Browser";
  return source;
}
