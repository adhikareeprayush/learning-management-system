"use client";

import { useState, useSyncExternalStore } from "react";
import { Loader2, MailWarning, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const DISMISS_KEY = "lms:verify-email-banner:dismissed";
const DISMISS_EVENT = "lms:verify-email-banner";

function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}

function readDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Storage can be unavailable (private mode); the banner just returns on reload.
  }
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

export function VerifyEmailBanner({ email }: { email: string }) {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (dismissed) return null;

  async function resend() {
    setSending(true);
    setError(null);
    try {
      const { error: sendError } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/email-verified",
      });
      if (sendError) {
        if (sendError.code === "EMAIL_ALREADY_VERIFIED") {
          window.location.reload();
          return;
        }
        setError(
          sendError.status === 429
            ? "Too many requests. Try again in a minute."
            : (sendError.message ?? "Could not send the email. Try again later."),
        );
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send the email. Try again later.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="status"
      className="mb-5 flex items-start gap-3 rounded-xl border border-brand-teal/25 bg-[#e8faf6] px-3 py-2.5 text-sm text-brand-navy sm:mb-6"
    >
      <MailWarning className="mt-0.5 size-4 shrink-0 text-brand-teal" />
      <div className="min-w-0 flex-1">
        <p>
          {sent ? (
            <>
              Sent. Check your inbox at <strong className="break-all">{email}</strong>.
            </>
          ) : (
            <>
              Please verify your email address. We sent a link to{" "}
              <strong className="break-all">{email}</strong>.
            </>
          )}
        </p>
        {error ? (
          <p role="alert" className="mt-1 text-red-600">
            {error}
          </p>
        ) : null}
      </div>
      {sent ? null : (
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          aria-busy={sending || undefined}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 font-semibold text-brand-purple transition hover:bg-white hover:text-brand-navy disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending…" : "Resend email"}
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        </button>
      )}
      <button
        type="button"
        onClick={dismiss}
        className="grid size-6 shrink-0 place-items-center rounded-md text-muted transition hover:bg-white hover:text-brand-navy"
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
