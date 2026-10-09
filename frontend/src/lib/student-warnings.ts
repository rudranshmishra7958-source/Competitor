import { readApplicationName } from "@/lib/app-name";

export type ViolationNotice = {
  message: string;
  pointsAdded?: number;
  totalScore?: number;
  effectiveType: string;
  source: "client" | "server";
};

const MESSAGES: Record<string, string> = {
  visibility_hidden: "You left the exam tab.",
  window_blur: "The exam window lost focus.",
  fullscreen_exit: "You left fullscreen.",
  clipboard_copy: "You copied from the exam page.",
  clipboard_cut: "You cut from the exam page.",
  clipboard_paste: "You pasted into the exam page.",
  contextmenu: "You opened the right-click menu.",
  devtools_open: "Developer tools were opened.",
  navigation_away: "You left the exam page.",
  process_blacklisted: "You opened another application.",
  foreground_app_changed: "You opened another application.",
  multiple_displays: "More than one display is connected.",
  display_state_changed: "More than one display is connected.",
  virtual_machine: "This session looks like it is running in a virtual machine.",
};

const FOREGROUND_TYPES = new Set(["process_blacklisted", "foreground_app_changed"]);

export function studentViolationMessage(
  type: string,
  metadata?: Record<string, unknown>,
): string {
  const name = readApplicationName(metadata);
  if (name && FOREGROUND_TYPES.has(type)) {
    return `You opened another application: ${name}.`;
  }
  return MESSAGES[type] ?? "A monitored action broke an exam rule.";
}
