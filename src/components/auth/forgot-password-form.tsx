"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

type ForgotPasswordFormProps = {
  emailEnabled: boolean;
  supportEmail: string | null;
};

export function ForgotPasswordForm({
  emailEnabled,
  supportEmail,
}: ForgotPasswordFormProps) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!emailEnabled) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-xl border border-black/10 bg-surface/50 px-4 py-3 text-sm text-[#324361]"
        >
          Password reset by email isn&apos;t available on this site right now.{" "}
          {supportEmail ? (
            <>
              Contact{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="font-semibold text-brand-purple"
              >
                {supportEmail}
              </a>{" "}
              to regain access.
            </>
          ) : (
            "Contact your institute to regain access."
          )}
        </p>
        <BackToLogin />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const address = email.trim();
    try {
      const { error: requestError } = await authClient.requestPasswordReset({
        email: address,
        redirectTo: "/reset-password",
      });
      if (requestError) {
        setError(
          requestError.status === 429
            ? "Too many requests. Try again in a minute."
            : (requestError.message ?? "Could not send the reset link. Try again."),
        );
        return;
      }
      setSentTo(address);
    } catch {
      setError("Could not send the reset link. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-brand-teal/25 bg-[#e8faf6] px-4 py-3 text-sm text-brand-navy"
        >
          <MailCheck className="mt-0.5 size-5 shrink-0 text-brand-teal" />
          <div className="min-w-0">
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-1">
              If an account exists for{" "}
              <strong className="break-all">{sentTo}</strong>, a reset link is on
              its way. It expires in 1 hour.
            </p>
          </div>
        </div>
        <p className="text-center text-sm text-muted">
          Didn&apos;t get it? Check your spam folder or{" "}
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="font-semibold text-brand-purple"
          >
            try again
          </button>
          .
        </p>
        <BackToLogin />
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">
          Email
        </span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full rounded-[10px] border border-black/10 bg-surface/50 px-4 py-3 outline-none ring-brand-purple focus:ring-2"
        />
      </label>
      <Button submit className="w-full" loading={loading}>
        {loading ? "Sending link…" : "Send reset link"}
      </Button>
      {error ? (
        <p role="alert" className="text-center text-sm text-red-500">
          {error}
        </p>
      ) : null}
      <BackToLogin />
    </form>
  );
}

function BackToLogin() {
  return (
    <p className="text-center text-sm text-muted">
      Remembered it?{" "}
      <Link href="/login" className="font-semibold text-brand-purple">
        Back to sign in
      </Link>
    </p>
  );
}
