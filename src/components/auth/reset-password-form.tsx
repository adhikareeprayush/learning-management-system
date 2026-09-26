"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

const inputClass =
  "w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const linkError = searchParams.get("error");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);

  if (expired || linkError || !token) {
    return (
      <div className="space-y-4">
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <p className="font-semibold">This reset link is invalid or has expired.</p>
          <p className="mt-1">
            Reset links work once and expire after 1 hour. Request a new one to
            continue.
          </p>
        </div>
        <Button href="/forgot-password" className="w-full">
          Request a new link
        </Button>
        <p className="text-center text-sm text-muted">
          <Link href="/login" className="font-semibold text-brand-purple">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) return;

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword,
        token,
      });
      if (resetError) {
        if (resetError.code === "INVALID_TOKEN") {
          setExpired(true);
          return;
        }
        setError(
          resetError.code === "PASSWORD_TOO_SHORT"
            ? `Use at least ${MIN_PASSWORD_LENGTH} characters.`
            : resetError.code === "PASSWORD_TOO_LONG"
              ? `Use at most ${MAX_PASSWORD_LENGTH} characters.`
              : resetError.status === 429
                ? "Too many attempts. Try again in a minute."
                : (resetError.message ?? "Could not reset your password."),
        );
        return;
      }
      router.replace("/login?reset=1");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">
          New password
        </span>
        <input
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">
          Confirm new password
        </span>
        <input
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat the new password"
          className={inputClass}
        />
      </label>
      <Button submit className="w-full" loading={loading}>
        {loading ? "Saving…" : "Set new password"}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm text-red-500">
          {error}
        </p>
      ) : null}
    </form>
  );
}
