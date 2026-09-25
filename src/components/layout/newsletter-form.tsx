"use client";

import { useId, useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" | "error"; message: string };

export function NewsletterForm() {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not subscribe");
      setEmail("");
      setStatus({
        kind: "done",
        message: data.alreadySubscribed
          ? "You're already on the list."
          : "Subscribed — thanks!",
      });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Could not subscribe",
      });
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-2">
      <label htmlFor={inputId} className="block text-sm font-semibold text-white">
        Newsletter
      </label>
      <p className="text-sm text-white/60">
        New courses and learning paths, straight to your inbox.
      </p>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-[10px] border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/40 focus:border-brand-mint/60"
        />
        <button
          type="submit"
          disabled={status.kind === "sending"}
          className="shrink-0 rounded-[10px] bg-brand-mint px-4 py-2.5 text-sm font-semibold text-[#0b0a2e] transition hover:bg-brand-mint/90 disabled:opacity-60"
        >
          {status.kind === "sending" ? "Joining…" : "Subscribe"}
        </button>
      </div>
      <p
        role="status"
        className={`min-h-5 text-xs ${
          status.kind === "error" ? "text-red-300" : "text-brand-mint"
        }`}
      >
        {status.kind === "done" || status.kind === "error" ? status.message : ""}
      </p>
    </form>
  );
}
