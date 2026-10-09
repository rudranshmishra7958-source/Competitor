"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionPayload } from "@exam/shared";
import { changePassword } from "@/lib/api";
import { persistSession, readClientSession } from "@/lib/session";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [required, setRequired] = useState(false);
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRequired(new URLSearchParams(window.location.search).get("required") === "1");
    const current = readClientSession();
    setSession(current);
    if (!current) router.replace("/");
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }
    const result = await changePassword(currentPassword, newPassword);
    setMessage(result.message);
    if (result.ok && session) {
      persistSession({ ...session, mustResetPassword: false });
      router.push(session.role === "admin" ? "/admin" : "/student/upcoming");
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md items-center px-6 py-16">
      <form
        onSubmit={submit}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
          Account security
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          {required ? "Set a new password to continue" : "Change password"}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use at least 12 characters with a mix of words or character types.
        </p>
        <PasswordField
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
        />
        <PasswordField label="New password" value={newPassword} onChange={setNewPassword} />
        <PasswordField
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        <button
          type="submit"
          className="mt-5 w-full rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
        >
          Save password
        </button>
        {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
        {!required ? (
          <Link href="/" className="mt-4 inline-block text-sm text-[var(--accent)] underline">
            Cancel
          </Link>
        ) : null}
      </form>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-4 block text-sm">
      {label}
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={label === "Current password" ? "current-password" : "new-password"}
        minLength={12}
        required
        className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-3 py-2"
      />
    </label>
  );
}
