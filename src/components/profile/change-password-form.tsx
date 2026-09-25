"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

const inputClass =
  "h-10 w-full rounded-xl border border-black/8 px-3 text-sm outline-none focus:border-brand-purple/40";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFlash(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current one.");
      return;
    }

    setSaving(true);
    try {
      const { error: changeError } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });
      if (changeError) {
        setError(
          changeError.code === "INVALID_PASSWORD"
            ? "Your current password is incorrect."
            : (changeError.message ?? "Could not change your password."),
        );
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFlash(
        revokeOtherSessions
          ? "Password updated. Other devices have been signed out."
          : "Password updated.",
      );
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-brand-purple">
          <KeyRound className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold text-[#324361]">Change password</h2>
          <p className="mt-0.5 text-sm text-muted">
            Use at least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-5 max-w-md space-y-4">
        <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#324361]">
            Current password
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#324361]">
            New password
          </span>
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={128}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[#324361]">
            Confirm new password
          </span>
          <input
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={128}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-[#324361]">
          <input
            type="checkbox"
            checked={revokeOtherSessions}
            onChange={(e) => setRevokeOtherSessions(e.target.checked)}
            className="accent-brand-purple"
          />
          Sign out of other devices
        </label>
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
        <Button submit loading={saving}>
          {saving ? "Updating…" : "Update password"}
        </Button>
      </form>
    </section>
  );
}
