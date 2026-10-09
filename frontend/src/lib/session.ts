import type { Role, SessionPayload } from "@exam/shared";

export const SESSION_COOKIE = "exam_session";
export const SESSION_STORAGE_KEY = "exam_session";

export type MockUser = SessionPayload & { password: string };

export const MOCK_USERS: MockUser[] = [
  {
    userId: "u-stu-1",
    role: "student",
    displayName: "Asha Rao",
    identifier: "STU001",
    institutionalId: "STU001",
    email: "student@college.edu",
    password: "password",
  },
  {
    userId: "u-stu-2",
    role: "student",
    displayName: "Kabir Singh",
    identifier: "STU002",
    institutionalId: "STU002",
    email: "kabir@college.edu",
    password: "password",
  },
  {
    userId: "u-fac-1",
    role: "admin",
    displayName: "Dr. Mehta",
    identifier: "FAC001",
    institutionalId: "FAC001",
    email: "faculty@college.edu",
    password: "password",
  },
];

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
  const { password: _pw, ...session } = user;
  return session;
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
