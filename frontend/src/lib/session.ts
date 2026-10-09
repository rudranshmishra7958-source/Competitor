import type { Role, SessionPayload } from "@exam/shared";

export const SESSION_COOKIE = "exam_session";
export const SESSION_STORAGE_KEY = "exam_session";

export type MockUser = SessionPayload & { password: string };

/** Demo directory; must match backend/app/seed.py. Passwords are only used in offline demo mode. */
const DEMO_DIRECTORY: [string, Role, string, string, string][] = [
  ["u-stu-1", "student", "Asha Rao", "STU001", "student@college.edu"],
  ["u-stu-2", "student", "Kabir Singh", "STU002", "kabir@college.edu"],
  ["u-stu-3", "student", "Meera Iyer", "STU003", "meera@college.edu"],
  ["u-stu-4", "student", "Rohan Das", "STU004", "rohan@college.edu"],
  ["u-stu-5", "student", "Priya Nair", "STU005", "priya@college.edu"],
  ["u-stu-6", "student", "Arjun Patel", "STU006", "arjun@college.edu"],
  ["u-stu-7", "student", "Sara Khan", "STU007", "sara@college.edu"],
  ["u-stu-8", "student", "Vikram Joshi", "STU008", "vikram@college.edu"],
  ["u-fac-1", "admin", "Dr. Mehta", "FAC001", "faculty@college.edu"],
  ["u-fac-2", "admin", "Prof. Banerjee", "FAC002", "proctor@college.edu"],
];

export const MOCK_USERS: MockUser[] = DEMO_DIRECTORY.map(
  ([userId, role, displayName, institutionalId, email]) => ({
    userId,
    role,
    displayName,
    identifier: institutionalId,
    institutionalId,
    email,
    password: "password",
  }),
);

export function normalizeIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

export function authenticate(
  identifier: string,
  password: string,
  expectedRole: Role,
): SessionPayload | null {
  const key = normalizeIdentifier(identifier);
  const user = MOCK_USERS.find(
    (u) =>
      u.role === expectedRole &&
      (normalizeIdentifier(u.institutionalId) === key ||
        normalizeIdentifier(u.email) === key),
  );
  if (!user || user.password !== password) {
    return null;
  }
  return {
    userId: user.userId,
    role: user.role,
    displayName: user.displayName,
    identifier: user.identifier,
    institutionalId: user.institutionalId,
    email: user.email,
  };
}

export function parseSession(raw: string | undefined | null): SessionPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SessionPayload;
    if (data.role !== "student" && data.role !== "admin") return null;
    if (!data.userId || !data.displayName) return null;
    return data;
  } catch {
    return null;
  }
}

export function persistSession(session: SessionPayload): void {
  const raw = JSON.stringify(session);
  localStorage.setItem(SESSION_STORAGE_KEY, raw);
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(raw)}; path=/; SameSite=Lax`;
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

export function readClientSession(): SessionPayload | null {
  const fromStorage = parseSession(localStorage.getItem(SESSION_STORAGE_KEY));
  if (fromStorage) return fromStorage;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return parseSession(decodeURIComponent(match.split("=").slice(1).join("=")));
}
