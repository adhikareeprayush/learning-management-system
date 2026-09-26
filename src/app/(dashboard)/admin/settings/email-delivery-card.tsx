"use client";

import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import type { EmailMode } from "@/lib/email";

const MODE_COPY: Record<EmailMode, { label: string; badge: string; description: string }> = {
  smtp: {
    label: "Connected",
    badge: "bg-emerald-50 text-emerald-800",
    description:
      "Emails go out through your SMTP server: password resets, payment and course updates, newsletters and contact-form messages.",
  },
  console: {
    label: "Development",
    badge: "bg-amber-50 text-amber-900",
    description:
      "Emails are written to the server log instead of being delivered. Ask your technical admin to configure email (SMTP) to send real email.",
  },
  disabled: {
    label: "Not configured",
    badge: "bg-slate-100 text-slate-600",
    description:
      "No emails are sent: password resets, notifications and newsletters won't reach anyone. Ask your technical admin to configure email (SMTP).",
  },
};

type Result = { kind: "ok" | "error"; message: string } | null;

export function EmailDeliveryCard({
  mode,
  sender,
  adminEmail,
}: {
  mode: EmailMode;
  sender: string | null;
  adminEmail: string;
}) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const copy = MODE_COPY[mode];

  async function sendTest() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/email-test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        mode?: EmailMode;
        to?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Test email failed");
      setResult({
        kind: "ok",
        message:
          data.mode === "console"
            ? `Printed to the server console (addressed to ${data.to}).`
            : `Sent to ${data.to}. Check your inbox (and spam folder).`,
      });
    } catch (error) {
      setResult({
        kind: "error",
        message: error instanceof Error ? error.message : "Test email failed",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-4 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-brand-navy">
          <Mail className="size-4 text-brand-purple" />
          Email delivery
        </h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${copy.badge}`}>
          {copy.label}
        </span>
      </div>
      <p className="mt-2 text-muted">{copy.description}</p>
      {mode === "smtp" && sender ? (
        <p className="mt-2 text-muted">
          Sender: <span className="break-all font-medium text-brand-navy">{sender}</span>
        </p>
      ) : null}

      {mode !== "disabled" ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => void sendTest()}
            disabled={sending}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-black/8 bg-white px-3 text-sm font-semibold text-brand-navy transition hover:bg-surface disabled:cursor-wait disabled:opacity-60"
          >
            {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {sending ? "Sending…" : "Send test email"}
          </button>
          <p className="text-xs text-muted">Goes to your own address, {adminEmail}.</p>
          {result ? (
            <p
              role={result.kind === "error" ? "alert" : "status"}
              className={`rounded-xl px-3 py-2 text-sm ${
                result.kind === "error"
                  ? "border border-red-200 bg-red-50 text-red-700"
                  : "border border-brand-teal/25 bg-[#e8faf6] text-brand-navy"
              }`}
            >
              {result.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
