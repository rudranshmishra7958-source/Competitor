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
  face_absent: "Your face was not visible to the camera.",
  framing_lost: "Your desk and shoulders are no longer in the camera frame.",
  camera_blocked: "The camera looks covered, frozen, or turned off.",
  virtual_camera: "A virtual camera was detected instead of a real webcam.",
  multiple_people: "Another person appeared on camera.",
  device_detected: "A phone or another device was visible on camera.",
};

export const CAMERA_TYPES = new Set([
  "face_absent",
  "framing_lost",
  "camera_blocked",
  "virtual_camera",
  "multiple_people",
  "device_detected",
]);

/** Dialog copy for camera incidents: tells the student plainly that they are being monitored. */
export function cameraWarningMessage(type: string, metadata: Record<string, unknown> = {}): string {
  const seconds =
    typeof metadata.sinceMs === "number" ? Math.max(1, Math.round(metadata.sinceMs / 1000)) : null;
  const detail =
    type === "face_absent" && seconds
      ? `No face was visible for ${seconds} seconds.`
      : type === "device_detected" && typeof metadata.label === "string"
        ? `A ${metadata.label} was visible on camera.`
        : type === "multiple_people" && typeof metadata.count === "number" && metadata.count > 1
          ? `${metadata.count} people were visible on camera.`
          : (MESSAGES[type] ?? "Suspicious activity was seen on camera.");
  return `${detail} A snapshot was recorded for review.`;
}

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
