const FOREGROUND_TYPES = new Set([
  "foreground_app_changed",
  "process_blacklisted",
]);

export function readApplicationName(metadata?: Record<string, unknown>): string | null {
  if (!metadata) return null;
  const raw = metadata.application ?? metadata.name;
  if (typeof raw !== "string") return null;
  const name = raw.replaceAll("/", "\\").split("\\").pop()?.trim() ?? "";
  if (!name || name === "." || name === "..") return null;
  return name.slice(0, 128);
}

export function formatForegroundDetail(
  type: string,
  metadata?: Record<string, unknown>,
): string | null {
  if (!FOREGROUND_TYPES.has(type)) return null;
  const name = readApplicationName(metadata);
  return name ? `Executable: ${name}` : null;
}
