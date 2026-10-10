"use client";

import Link from "next/link";
import { Wordmark } from "@/components/brand/VigilMark";
import { Button } from "@/components/ui/Button";
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
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4 py-12">
      <form onSubmit={submit} className="rise w-full rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-float)] sm:p-8">
        <Link href="/" aria-label="Vigil home" className="inline-block">
          <Wordmark />
        </Link>
        <p className="mt-8 text-sm text-muted-foreground">Account security</p>
        <h1 className="mt-1 text-3xl tracking-[-0.035em]">
          {required ? "Set a new password to continue" : "Change password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
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
        <Button type="submit" size="lg" className="mt-6 w-full">
          Save password
        </Button>
        {message ? (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm" role="status">
            {message}
          </p>
        ) : null}
        {!required ? (
          <Link href="/" className="mt-4 inline-block text-sm text-foreground underline-offset-2 hover:underline">
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
        className="mt-1.5 min-h-11 w-full rounded-xl border border-border px-3.5 py-2.5"
      />
    </label>
  );
}
