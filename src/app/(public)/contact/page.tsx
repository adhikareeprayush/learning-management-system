"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { PageHero } from "@/components/layout/page-hero";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [flash, setFlash] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFlash(
      `Thanks${name.trim() ? `, ${name.trim()}` : ""} — message received. This demo doesn't send email yet, but the form works.`,
    );
    setName("");
    setEmail("");
    setMessage("");
  }

  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Get in <span className="text-brand-mint">touch</span>
          </>
        }
        description="Questions about the project, a walkthrough, or feedback on the build."
        icon={Mail}
      />
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 md:grid-cols-2 md:px-10 lg:px-16">
        <div className="space-y-4 text-muted">
          <p>
            Edujarr is a portfolio LMS demo. If you&apos;re reviewing the
            implementation or want to discuss the stack, reach out.
          </p>
          <p>
            <span className="font-semibold text-[#324361]">Email</span>
            <br />
            hello@edujarr.com
          </p>
          <p>
            <span className="font-semibold text-[#324361]">Location</span>
            <br />
            Kathmandu, Nepal
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-black/5 bg-surface/40 p-6"
        >
          <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <textarea
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's on your mind?"
            className="min-h-32 w-full rounded-xl border border-black/10 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          <Button submit className="w-full">
            Send message
          </Button>
        </form>
      </div>
    </div>
  );
}
