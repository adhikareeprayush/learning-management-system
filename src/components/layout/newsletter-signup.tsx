"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFlash(null);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        alreadySubscribed?: boolean;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "Subscription failed");
      }

      setFlash(
        data.alreadySubscribed
          ? "You're already on our list — thanks for staying subscribed!"
          : "You're subscribed! Watch your inbox for course updates.",
      );
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Subscription failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg">Newsletter</h3>
      <p className="text-sm leading-relaxed text-white/70">
        Monthly updates on new lessons and roadmaps. No spam — unsubscribe
        anytime from the admin demo.
      </p>
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <form onSubmit={subscribe} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 outline-none focus:border-brand-mint"
        />
        <Button
          type="submit"
          variant="mint"
          disabled={loading}
          className="shrink-0 rounded-full px-5"
        >
          {loading ? "Joining…" : "Subscribe"}
        </Button>
      </form>
    </div>
  );
}
