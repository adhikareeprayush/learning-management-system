import { after, NextResponse } from "next/server";
import { cleanString, requireTenantApi } from "@/lib/api";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  contactFormAvailable,
  contactRecipient,
  deliverContactMessage,
} from "@/lib/emails/contact-email";
import { CONTACT_LIMITS, isContactTopic } from "@/lib/emails/contact-topics";
import { hashClientIp, honeypotTripped } from "@/lib/emails/form-guard";
import { isValidNewsletterEmail } from "@/lib/newsletter";

const TEN_MINUTES = 10 * 60_000;
const ONE_HOUR = 60 * 60_000;
/** Faster than this from page load to submit is a script, not a person. */
const MIN_FILL_MS = 3_000;

function error(message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json({ error: message, ...(fields ? { fields } : {}) }, { status });
}

export async function POST(request: Request) {
  // JSON only: plain cross-site HTML forms can't send it without a CORS preflight.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return error("Send the form as JSON", 415);
  }

  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid request", 400);

  const elapsedMs = Number(body.elapsedMs);
  if (honeypotTripped(body.website) || !Number.isFinite(elapsedMs) || elapsedMs < MIN_FILL_MS) {
    // Look successful so bots don't learn what tripped them.
    return NextResponse.json({ ok: true });
  }

  const name = cleanString(body.name, 500).replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ");
  const email = cleanString(body.email, 500).toLowerCase();
  const topic = cleanString(body.topic, 40);
  const message = cleanString(body.message, 20_000);

  const fields: Record<string, string> = {};
  if (name.length < CONTACT_LIMITS.nameMin || name.length > CONTACT_LIMITS.nameMax) {
    fields.name = `Enter your name (${CONTACT_LIMITS.nameMin}–${CONTACT_LIMITS.nameMax} characters).`;
  }
  if (email.length > CONTACT_LIMITS.emailMax || !isValidNewsletterEmail(email)) {
    fields.email = "Enter a valid email address.";
  }
  if (!isContactTopic(topic)) fields.topic = "Choose a topic.";
  if (message.length < CONTACT_LIMITS.messageMin || message.length > CONTACT_LIMITS.messageMax) {
    fields.message = `Write ${CONTACT_LIMITS.messageMin}–${CONTACT_LIMITS.messageMax.toLocaleString()} characters.`;
  }
  if (Object.keys(fields).length > 0) return error("Please check the highlighted fields", 400, fields);

  const { organization } = tenant;
  if (!contactFormAvailable(organization)) {
    const fallback = contactRecipient(organization);
    return error(
      fallback
        ? `The contact form is unavailable right now. Please email us at ${fallback}.`
        : "The contact form is unavailable right now. Please try again later.",
      503,
    );
  }

  const ipHash = hashClientIp(request);
  const since10m = new Date(Date.now() - TEN_MINUTES);
  const since1h = new Date(Date.now() - ONE_HOUR);
  const [fromIp, fromEmail, overall] = await Promise.all([
    ipHash
      ? prisma.contactMessage.count({ where: { ipHash, createdAt: { gte: since10m } } })
      : 0,
    prisma.contactMessage.count({ where: { email, createdAt: { gte: since1h } } }),
    // Global breaker so a botnet can't burn through the SMTP quota.
    prisma.contactMessage.count({
      where: { organizationId: organization.id, createdAt: { gte: since10m } },
    }),
  ]);
  if (fromIp >= 5 || fromEmail >= 3 || overall >= 50) {
    return error(
      "You've sent several messages already. Please wait a little while before sending another.",
      429,
    );
  }

  const session = await getServerSession();
  const saved = await prisma.contactMessage.create({
    data: {
      organizationId: organization.id,
      userId: session?.user.id ?? null,
      name,
      email,
      topic,
      message,
      ipHash,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    select: { id: true },
  });

  after(() => deliverContactMessage(saved.id));

  return NextResponse.json({ ok: true });
}
