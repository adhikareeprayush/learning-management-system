"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

type State = { kind: "idle" | "working" | "done" } | { kind: "error"; message: string };

export function ConfirmUnsubscribe({
  subscriberId,
  token,
  maskedEmail,
}: {
  subscriberId: string;
  token: string;
  maskedEmail: string;
}) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function confirm() {
    setState({ kind: "working" });
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ s: subscriberId, t: token }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not unsubscribe");
      setState({ kind: "done" });
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not unsubscribe",
      });
    }
  }

  if (state.kind === "done") {
    return (
      <div role="status" className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-brand-navy">
          <CheckCircle2 className="size-5 text-brand-teal" />
          You&apos;ve been unsubscribed
        </h2>
        <p className="text-muted">
          {maskedEmail} won&apos;t receive any more newsletter emails from us.
          Changed your mind? You can sign up again from the form at the bottom
          of any page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-brand-navy">Unsubscribe from the newsletter?</h2>
      <p className="text-muted">
        We&apos;ll stop sending newsletter emails to{" "}
        <span className="font-semibold text-brand-navy">{maskedEmail}</span>.
      </p>
      {state.kind === "error" ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={state.kind === "working"}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-navy px-6 py-3 text-[15px] font-semibold text-white transition hover:bg-brand-navy/90 disabled:cursor-wait disabled:opacity-60"
      >
        {state.kind === "working" ? <Loader2 className="size-4 animate-spin" /> : null}
        {state.kind === "working" ? "Unsubscribing…" : "Unsubscribe"}
      </button>
    </div>
  );
}
