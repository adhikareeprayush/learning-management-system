import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

// Plain Node module (no next/* imports) so tsx scripts can use it too.

export type EmailMode = "smtp" | "console" | "disabled";

export type EmailCategory = "auth" | "notification" | "newsletter" | "contact" | "test";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  category: EmailCategory;
};

export type SendEmailResult =
  | { ok: true; mode: "smtp" | "console"; messageId?: string }
  | { ok: false; mode: EmailMode; error: string; code?: string };

/**
 * smtp when SMTP_HOST is set; console in development (or EMAIL_TRANSPORT=console)
 * so reset/verification links can be copied from the terminal; otherwise disabled.
 */
export function getEmailMode(): EmailMode {
  if (process.env.EMAIL_TRANSPORT === "console") return "console";
  if (process.env.SMTP_HOST?.trim()) return "smtp";
  if (process.env.NODE_ENV !== "production") return "console";
  return "disabled";
}

export function canSendEmail() {
  return getEmailMode() !== "disabled";
}

const DEV_FROM = "Convolution LMS <no-reply@localhost>";

function emailFrom() {
  return process.env.EMAIL_FROM?.trim() || (getEmailMode() === "smtp" ? "" : DEV_FROM);
}

function smtpOptions() {
  const port = Number(process.env.SMTP_PORT ?? 587);
  return {
    host: process.env.SMTP_HOST!.trim(),
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? "" }
      : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
}

const globalForEmail = globalThis as unknown as { emailTransport?: Transporter };

function transport() {
  globalForEmail.emailTransport ??= nodemailer.createTransport(smtpOptions());
  return globalForEmail.emailTransport;
}

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isSuppressed(address: string) {
  // Anonymized accounts get deleted-<id>@deleted.invalid addresses.
  return /\.invalid$/i.test(address.trim());
}

function logToConsole(msg: OutgoingEmail) {
  const links = msg.text.match(/https?:\/\/[^\s<>"]+/g) ?? [];
  console.info(
    [
      `\n[email:${msg.category}] to ${msg.to}`,
      `Subject: ${cleanHeader(msg.subject)}`,
      ...(links.length ? ["Links:", ...links.map((link) => `  ${link}`)] : []),
      "",
      msg.text,
      "",
    ].join("\n"),
  );
}

function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

async function deliver(
  send: (options: SendMailOptions) => Promise<{ messageId?: string }>,
  msg: OutgoingEmail,
): Promise<SendEmailResult> {
  const mode = getEmailMode();
  if (isSuppressed(msg.to)) return { ok: false, mode, error: "suppressed" };

  if (mode === "disabled") {
    // Never log bodies here: they can carry reset and verification tokens.
    console.warn(`[email] not configured – dropped "${cleanHeader(msg.subject)}"`);
    return { ok: false, mode, error: "Email delivery is not configured" };
  }

  if (mode === "console") {
    logToConsole(msg);
    return { ok: true, mode };
  }

  const from = emailFrom();
  if (!from) return { ok: false, mode, error: "EMAIL_FROM is not set" };

  try {
    const info = await send({
      from,
      to: msg.to,
      subject: cleanHeader(msg.subject),
      text: msg.text,
      html: msg.html,
      replyTo: msg.replyTo,
      headers: msg.headers,
    });
    return { ok: true, mode, messageId: info.messageId };
  } catch (error) {
    return {
      ok: false,
      mode,
      error: error instanceof Error ? error.message : "Email send failed",
      code: errorCode(error),
    };
  }
}

/** Sends one email. Never throws; inspect the result. */
export async function sendEmail(msg: OutgoingEmail): Promise<SendEmailResult> {
  return deliver((options) => transport().sendMail(options), msg);
}

export async function sendEmailOrThrow(msg: OutgoingEmail) {
  const result = await sendEmail(msg);
  if (!result.ok) throw new Error(result.error);
}

export async function verifyEmailTransport(): Promise<SendEmailResult> {
  const mode = getEmailMode();
  if (mode !== "smtp") {
    return mode === "console"
      ? { ok: true, mode }
      : { ok: false, mode, error: "Email delivery is not configured" };
  }
  try {
    await transport().verify();
    return { ok: true, mode };
  } catch (error) {
    return {
      ok: false,
      mode,
      error: error instanceof Error ? error.message : "SMTP verification failed",
      code: errorCode(error),
    };
  }
}

/** Pooled connection for bulk sends (newsletters); closed when `fn` finishes. */
export async function withBulkTransport<T>(
  fn: (send: (msg: OutgoingEmail) => Promise<SendEmailResult>) => Promise<T>,
): Promise<T> {
  if (getEmailMode() !== "smtp") return fn(sendEmail);

  const pooled = nodemailer.createTransport({
    ...smtpOptions(),
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
  try {
    return await fn((msg) => deliver((options) => pooled.sendMail(options), msg));
  } finally {
    pooled.close();
  }
}
