"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { CONTACT_LIMITS, CONTACT_TOPICS } from "@/lib/emails/contact-topics";

type Field = "name" | "email" | "topic" | "message";
type FieldErrors = Partial<Record<Field, string>>;

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition focus:border-brand-purple/40 focus:ring-2 focus:ring-brand-purple/15 aria-invalid:border-red-300";

export function ContactForm({
  defaultName = "",
  defaultEmail = "",
  fallbackEmail,
}: {
  defaultName?: string;
  defaultEmail?: string;
  fallbackEmail: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [topic, setTopic] = useState<string>(CONTACT_TOPICS[0].value);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  function clearError(field: Field) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const website = new FormData(event.currentTarget).get("website");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          topic,
          message,
          website,
          elapsedMs: Date.now() - openedAt.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fields?: FieldErrors;
      };
      if (!res.ok) {
        if (data.fields) setFieldErrors(data.fields);
        throw new Error(
          data.error ??
            (res.status === 429
              ? "Too many messages. Please wait a little while."
              : `Couldn't send your message. Email us at ${fallbackEmail}.`),
        );
      }
      setSentTo(email.trim());
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't send your message");
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="rounded-3xl border border-brand-teal/25 bg-[#e8faf6] p-6 md:p-8"
      >
        <CheckCircle2 className="size-8 text-brand-teal" />
        <h2 className="mt-3 text-xl font-semibold text-brand-navy">Message sent</h2>
        <p className="mt-2 text-muted">
          Thanks for getting in touch. We&apos;ll reply to{" "}
          <span className="font-semibold text-brand-navy">{sentTo}</span>, usually
          within a working day.
        </p>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            openedAt.current = Date.now();
          }}
          className="mt-4 text-sm font-semibold text-brand-purple hover:text-brand-teal"
        >
          Send another message
        </button>
      </div>
    );
  }

  const remaining = CONTACT_LIMITS.messageMax - message.length;

  function fieldError(field: Field) {
    return fieldErrors[field] ? (
      <span id={`contact-${field}-error`} className="mt-1 block text-xs text-red-600">
        {fieldErrors[field]}
      </span>
    ) : null;
  }

  return (
    <form
      onSubmit={submit}
      className="relative space-y-4 rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-8"
    >
      <div>
        <h2 className="text-xl font-semibold text-brand-navy">Send us a message</h2>
        <p className="mt-1 text-sm text-muted">
          For payments, include the course name so we can find your record.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#324361]">Your name</span>
          <input
            name="name"
            required
            minLength={CONTACT_LIMITS.nameMin}
            maxLength={CONTACT_LIMITS.nameMax}
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearError("name");
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "contact-name-error" : undefined}
            className={inputClass}
          />
          {fieldError("name")}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#324361]">Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={CONTACT_LIMITS.emailMax}
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearError("email");
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "contact-email-error" : undefined}
            className={inputClass}
          />
          {fieldError("email")}
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">Topic</span>
        <select
          name="topic"
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            clearError("topic");
          }}
          aria-invalid={Boolean(fieldErrors.topic)}
          aria-describedby={fieldErrors.topic ? "contact-topic-error" : undefined}
          className={inputClass}
        >
          {CONTACT_TOPICS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {fieldError("topic")}
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-[#324361]">Message</span>
        <textarea
          name="message"
          required
          rows={6}
          minLength={CONTACT_LIMITS.messageMin}
          maxLength={CONTACT_LIMITS.messageMax}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            clearError("message");
          }}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={`contact-message-count${fieldErrors.message ? " contact-message-error" : ""}`}
          className={`${inputClass} resize-y`}
        />
        <span className="mt-1 flex justify-between gap-3 text-xs text-muted">
          <span>{fieldError("message")}</span>
          <span id="contact-message-count" className={remaining < 200 ? "text-amber-700" : undefined}>
            {remaining.toLocaleString()} characters left
          </span>
        </span>
      </label>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      <button
        type="submit"
        disabled={sending}
        className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-gradient px-6 py-3 text-[15px] font-semibold tracking-wide text-white shadow-md shadow-brand-purple/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
      >
        {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {sending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
