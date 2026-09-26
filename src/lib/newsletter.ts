import type {
  NewsletterCampaignStatus,
  NewsletterDeliveryStatus,
  NewsletterSubscriberStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  canSendEmail,
  sendEmail,
  verifyEmailTransport,
  withBulkTransport,
  type OutgoingEmail,
  type SendEmailResult,
} from "@/lib/email";
import { getEmailBranding, type EmailBranding } from "@/lib/email-layout";
import {
  listUnsubscribeHeaders,
  newsletterEmail,
  newsletterWelcomeEmail,
} from "@/lib/emails/newsletter-email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const campaignInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export function isValidNewsletterEmail(email: string) {
  return EMAIL_RE.test(email);
}

/**
 * Adds or reactivates a subscriber. `alreadySubscribed` is for server-side
 * decisions (e.g. the welcome email); public responses must not reveal it.
 */
export async function subscribeToNewsletter(input: {
  organizationId: string;
  email: string;
  name?: string | null;
  source?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!isValidNewsletterEmail(email)) {
    return { ok: false as const, error: "Enter a valid email address", status: 400 };
  }

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { organizationId_email: { organizationId: input.organizationId, email } },
  });

  if (existing?.status === "ACTIVE") {
    return { ok: true as const, alreadySubscribed: true, subscriber: existing };
  }

  const subscriber = existing
    ? await prisma.newsletterSubscriber.update({
        where: { organizationId_email: { organizationId: input.organizationId, email } },
        data: {
          status: "ACTIVE",
          name: input.name?.trim() || existing.name,
          source: input.source?.trim() || existing.source,
          unsubscribedAt: null,
        },
      })
    : await prisma.newsletterSubscriber.create({
        data: {
          organizationId: input.organizationId,
          email,
          name: input.name?.trim() || null,
          source: input.source?.trim() || "footer",
        },
      });

  return { ok: true as const, alreadySubscribed: false, subscriber };
}

/** Idempotent; used by the signed unsubscribe link, which already proved the id. */
export async function unsubscribeNewsletterById(subscriberId: string) {
  await prisma.newsletterSubscriber.updateMany({
    where: { id: subscriberId, status: "ACTIVE" },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
}

export async function getNewsletterSubscriber(subscriberId: string) {
  return prisma.newsletterSubscriber.findUnique({
    where: { id: subscriberId },
    select: { id: true, email: true, status: true },
  });
}

export async function buildNewsletterWelcomeEmail(subscriberId: string): Promise<OutgoingEmail | null> {
  const subscriber = await getNewsletterSubscriber(subscriberId);
  if (!subscriber || subscriber.status !== "ACTIVE") return null;

  const branding = await getEmailBranding();
  const rendered = newsletterWelcomeEmail(branding, subscriber.id);
  return {
    to: subscriber.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    headers: listUnsubscribeHeaders(subscriber.id, branding.supportEmail),
    category: "newsletter",
  };
}

export async function unsubscribeNewsletter(organizationId: string, email: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { organizationId_email: { organizationId, email: normalized } },
  });

  if (!existing) {
    return { ok: false as const, error: "Subscriber not found", status: 404 };
  }

  if (existing.status === "UNSUBSCRIBED") {
    return { ok: true as const, subscriber: existing };
  }

  const subscriber = await prisma.newsletterSubscriber.update({
    where: { organizationId_email: { organizationId, email: normalized } },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });

  return { ok: true as const, subscriber };
}

export async function listNewsletterSubscribers(
  organizationId: string,
  filters?: {
    status?: NewsletterSubscriberStatus;
    q?: string;
  },
) {
  const q = filters?.q?.trim();
  return prisma.newsletterSubscriber.findMany({
    where: {
      organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { subscribedAt: "desc" },
  });
}

export async function listNewsletterCampaigns(organizationId: string) {
  return prisma.newsletterCampaign.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    include: campaignInclude,
  });
}

const SUBJECT_MAX = 200;
const BODY_MAX = 50_000;

function validateCampaignFields(fields: { subject?: string; body?: string }) {
  if (fields.subject !== undefined) {
    if (!fields.subject) return "Subject is required";
    if (fields.subject.length > SUBJECT_MAX) {
      return `Subject must be ${SUBJECT_MAX} characters or fewer`;
    }
  }
  if (fields.body !== undefined) {
    if (!fields.body) return "Message body is required";
    if (fields.body.length > BODY_MAX) {
      return `Message body must be ${BODY_MAX.toLocaleString()} characters or fewer`;
    }
  }
  return null;
}

export async function createNewsletterCampaign(input: {
  organizationId: string;
  subject: string;
  body: string;
  createdById: string;
}) {
  const subject = input.subject.trim();
  const body = input.body.trim();

  const invalid = validateCampaignFields({ subject, body });
  if (invalid) return { ok: false as const, error: invalid, status: 400 };

  const campaign = await prisma.newsletterCampaign.create({
    data: {
      organizationId: input.organizationId,
      subject,
      body,
      createdById: input.createdById,
    },
    include: campaignInclude,
  });

  return { ok: true as const, campaign };
}

/** Distinguishes "no such campaign" from "not a draft any more" after a guarded write matched nothing. */
async function draftGuardFailure(organizationId: string, campaignId: string) {
  const exists = await prisma.newsletterCampaign.findFirst({
    where: { id: campaignId, organizationId },
    select: { id: true },
  });
  return exists
    ? { ok: false as const, error: "Only draft campaigns can be changed", status: 409 }
    : { ok: false as const, error: "Campaign not found", status: 404 };
}

export async function updateNewsletterCampaign(
  organizationId: string,
  campaignId: string,
  input: { subject?: string; body?: string },
) {
  const fields = {
    ...(input.subject !== undefined ? { subject: input.subject.trim() } : {}),
    ...(input.body !== undefined ? { body: input.body.trim() } : {}),
  };
  if (Object.keys(fields).length === 0) {
    return { ok: false as const, error: "Nothing to update", status: 400 };
  }
  const invalid = validateCampaignFields(fields);
  if (invalid) return { ok: false as const, error: invalid, status: 400 };

  const { count } = await prisma.newsletterCampaign.updateMany({
    where: { id: campaignId, organizationId, status: "DRAFT" },
    data: fields,
  });
  if (count === 0) return draftGuardFailure(organizationId, campaignId);

  const campaign = await prisma.newsletterCampaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: campaignInclude,
  });
  return { ok: true as const, campaign };
}

export async function deleteNewsletterCampaign(organizationId: string, campaignId: string) {
  const { count } = await prisma.newsletterCampaign.deleteMany({
    where: { id: campaignId, organizationId, status: "DRAFT" },
  });
  if (count === 0) return draftGuardFailure(organizationId, campaignId);
  return { ok: true as const };
}

/**
 * For when email delivery isn't configured: only records the campaign as sent
 * (with the active-subscriber count at that moment). It does not deliver email.
 */
export async function markNewsletterCampaignSent(organizationId: string, campaignId: string) {
  if (canSendEmail()) {
    return {
      ok: false as const,
      error: "Email delivery is configured, so send the campaign instead of marking it sent",
      status: 409,
    };
  }

  const activeCount = await prisma.newsletterSubscriber.count({
    where: { organizationId, status: "ACTIVE" },
  });

  const { count } = await prisma.newsletterCampaign.updateMany({
    where: { id: campaignId, organizationId, status: "DRAFT" },
    data: {
      status: "SENT" satisfies NewsletterCampaignStatus,
      sentAt: new Date(),
      recipientCount: activeCount,
    },
  });
  if (count === 0) {
    const failure = await draftGuardFailure(organizationId, campaignId);
    return failure.status === 409
      ? { ...failure, error: "Campaign was already marked as sent" }
      : failure;
  }

  const campaign = await prisma.newsletterCampaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: campaignInclude,
  });
  return { ok: true as const, campaign, recipientCount: activeCount };
}

/* Delivery */

export type NewsletterSendProgress = {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  remaining: number;
  done: boolean;
};

type NewsletterFailure = { ok: false; error: string; status: number; code?: string };

const EMAIL_NOT_CONFIGURED: NewsletterFailure = {
  ok: false,
  error: "Email delivery isn't configured, so campaigns can only be marked as sent",
  status: 409,
  code: "EMAIL_NOT_CONFIGURED",
};

const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 200;
/** Leaves headroom under the route's maxDuration (60 s) for the claim and finalize queries. */
const BATCH_TIME_BUDGET_MS = 20_000;
const SEND_CONCURRENCY = 3;
const MAX_ATTEMPTS = 3;
const CREATE_CHUNK = 1_000;

// Connection/auth problems affect every recipient, so the batch stops and the
// rows go back to PENDING instead of being marked FAILED one by one.
const TRANSPORT_ERROR_CODES = new Set([
  "EAUTH",
  "ECONNECTION",
  "ECONNREFUSED",
  "ECONNRESET",
  "EDNS",
  "ESOCKET",
  "ETIMEDOUT",
  "ETLS",
]);

function newsletterBatchSize() {
  const value = Number(process.env.NEWSLETTER_BATCH_SIZE);
  return Number.isInteger(value) && value > 0
    ? Math.min(value, MAX_BATCH_SIZE)
    : DEFAULT_BATCH_SIZE;
}

function isTransportFailure(result: SendEmailResult) {
  if (result.ok) return false;
  if (result.mode === "disabled" || result.error === "EMAIL_FROM is not set") return true;
  return result.code ? TRANSPORT_ERROR_CODES.has(result.code) : false;
}

function emptyCounts(): Record<NewsletterDeliveryStatus, number> {
  return { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0, SKIPPED: 0 };
}

function toProgress(counts: Record<NewsletterDeliveryStatus, number>): NewsletterSendProgress {
  const remaining = counts.PENDING + counts.SENDING;
  return {
    total: remaining + counts.SENT + counts.FAILED + counts.SKIPPED,
    sent: counts.SENT,
    failed: counts.FAILED,
    skipped: counts.SKIPPED,
    remaining,
    done: remaining === 0,
  };
}

/** Delivery progress for several campaigns at once (admin list). */
export async function listNewsletterSendProgress(campaignIds: string[]) {
  const progress = new Map<string, NewsletterSendProgress>();
  if (campaignIds.length === 0) return progress;

  const groups = await prisma.newsletterDelivery.groupBy({
    by: ["campaignId", "status"],
    where: { campaignId: { in: campaignIds } },
    _count: { _all: true },
  });
  const counts = new Map<string, Record<NewsletterDeliveryStatus, number>>();
  for (const group of groups) {
    const entry = counts.get(group.campaignId) ?? emptyCounts();
    entry[group.status] = group._count._all;
    counts.set(group.campaignId, entry);
  }
  for (const id of campaignIds) progress.set(id, toProgress(counts.get(id) ?? emptyCounts()));
  return progress;
}

async function newsletterSendProgress(campaignId: string) {
  const progress = await listNewsletterSendProgress([campaignId]);
  return progress.get(campaignId)!;
}

async function findCampaign(organizationId: string, campaignId: string) {
  return prisma.newsletterCampaign.findFirst({
    where: { id: campaignId, organizationId },
    include: campaignInclude,
  });
}

/**
 * Moves a draft to SENDING and queues one delivery row per active subscriber.
 * Calling it again for a campaign that is already SENDING just reports progress,
 * which is how an interrupted send is resumed.
 */
export async function startNewsletterCampaign(organizationId: string, campaignId: string) {
  if (!canSendEmail()) return EMAIL_NOT_CONFIGURED;

  const existing = await findCampaign(organizationId, campaignId);
  if (!existing) return { ok: false as const, error: "Campaign not found", status: 404 };
  if (existing.status === "SENT") {
    return { ok: false as const, error: "This campaign was already sent", status: 409 };
  }

  if (existing.status === "DRAFT") {
    const check = await verifyEmailTransport();
    if (!check.ok) {
      return {
        ok: false as const,
        error: `Couldn't connect to the mail server: ${check.error}`,
        status: 502,
      };
    }

    const subscribers = await prisma.newsletterSubscriber.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { id: true, email: true },
      orderBy: { subscribedAt: "asc" },
    });
    if (subscribers.length === 0) {
      return { ok: false as const, error: "There are no active subscribers to send to", status: 409 };
    }

    // One transaction so nobody can see SENDING before its delivery rows exist
    // (a concurrent batch would otherwise finalize an empty campaign).
    const started = await prisma.$transaction(
      async (tx) => {
        const { count } = await tx.newsletterCampaign.updateMany({
          where: { id: campaignId, organizationId, status: "DRAFT" },
          data: { status: "SENDING", startedAt: new Date() },
        });
        if (count === 0) return false;
        for (let i = 0; i < subscribers.length; i += CREATE_CHUNK) {
          await tx.newsletterDelivery.createMany({
            data: subscribers.slice(i, i + CREATE_CHUNK).map((subscriber) => ({
              campaignId,
              subscriberId: subscriber.id,
              email: subscriber.email,
            })),
            skipDuplicates: true,
          });
        }
        return true;
      },
      { timeout: 30_000 },
    );

    if (!started) {
      const current = await findCampaign(organizationId, campaignId);
      if (current?.status !== "SENDING") {
        return {
          ok: false as const,
          error: current ? "This campaign was already sent" : "Campaign not found",
          status: current ? 409 : 404,
        };
      }
    }
  }

  const [campaign, progress] = await Promise.all([
    findCampaign(organizationId, campaignId),
    newsletterSendProgress(campaignId),
  ]);
  return { ok: true as const, campaign: campaign!, progress };
}

type ClaimedDelivery = {
  id: string;
  email: string;
  subscriberId: string | null;
  attempts: number;
};

async function claimDeliveries(campaignId: string, limit: number) {
  // SKIP LOCKED lets two admins (or tabs) run batches side by side without
  // double-sending; SENDING rows older than 5 minutes belong to a batch that
  // died mid-way and are picked up again.
  return prisma.$queryRaw<ClaimedDelivery[]>`
    UPDATE "newsletter_deliveries"
    SET "status" = 'SENDING', "claimedAt" = (NOW() AT TIME ZONE 'UTC'), "attempts" = "attempts" + 1
    WHERE "id" IN (
      SELECT "id" FROM "newsletter_deliveries"
      WHERE "campaignId" = ${campaignId}
        AND (
          "status" = 'PENDING'
          OR ("status" = 'SENDING' AND "claimedAt" < (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes')
        )
      ORDER BY "createdAt", "id"
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id", "email", "subscriberId", "attempts"`;
}

function newsletterMessage(
  campaign: { subject: string; body: string },
  delivery: ClaimedDelivery & { subscriberId: string },
  branding: EmailBranding,
): OutgoingEmail {
  const rendered = newsletterEmail(branding, campaign, { subscriberId: delivery.subscriberId });
  return {
    to: delivery.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    headers: listUnsubscribeHeaders(delivery.subscriberId, branding.supportEmail),
    category: "newsletter",
  };
}

async function finalizeIfComplete(campaignId: string) {
  const progress = await newsletterSendProgress(campaignId);
  if (progress.done) {
    await prisma.newsletterCampaign.updateMany({
      where: { id: campaignId, status: "SENDING" },
      data: {
        status: "SENT",
        sentAt: new Date(),
        recipientCount: progress.sent,
        failedCount: progress.failed,
      },
    });
  }
  return progress;
}

/**
 * Sends the next batch of a SENDING campaign. The admin UI calls this
 * repeatedly until `done`, so each request stays short enough for serverless.
 */
export async function sendNewsletterBatch(organizationId: string, campaignId: string) {
  const campaign = await findCampaign(organizationId, campaignId);
  if (!campaign) return { ok: false as const, error: "Campaign not found", status: 404 };
  if (campaign.status === "DRAFT") {
    return { ok: false as const, error: "Start sending the campaign first", status: 409 };
  }
  if (campaign.status === "SENT") {
    return {
      ok: true as const,
      campaign,
      progress: await newsletterSendProgress(campaignId),
      claimed: 0,
    };
  }
  if (!canSendEmail()) return EMAIL_NOT_CONFIGURED;

  const startedAt = Date.now();
  const claimed = await claimDeliveries(campaignId, newsletterBatchSize());
  let transportError: string | null = null;

  if (claimed.length > 0) {
    const subscriberIds = claimed.flatMap((row) => (row.subscriberId ? [row.subscriberId] : []));
    const active = new Set(
      (
        await prisma.newsletterSubscriber.findMany({
          where: { id: { in: subscriberIds }, organizationId, status: "ACTIVE" },
          select: { id: true },
        })
      ).map((subscriber) => subscriber.id),
    );

    const skipped = claimed.filter((row) => !row.subscriberId || !active.has(row.subscriberId));
    const exhausted = claimed.filter(
      (row) => !skipped.includes(row) && row.attempts > MAX_ATTEMPTS,
    );
    const queue = claimed.filter(
      (row): row is ClaimedDelivery & { subscriberId: string } =>
        !skipped.includes(row) && !exhausted.includes(row),
    );

    if (skipped.length > 0) {
      await prisma.newsletterDelivery.updateMany({
        where: { id: { in: skipped.map((row) => row.id) } },
        data: { status: "SKIPPED", error: "Unsubscribed before delivery" },
      });
    }
    if (exhausted.length > 0) {
      await prisma.newsletterDelivery.updateMany({
        where: { id: { in: exhausted.map((row) => row.id) } },
        data: { status: "FAILED", error: `Gave up after ${MAX_ATTEMPTS} attempts` },
      });
    }

    const unsent = new Set(queue.map((row) => row.id));
    if (queue.length > 0) {
      const branding = await getEmailBranding();
      const content = { subject: campaign.subject, body: campaign.body };

      await withBulkTransport(async (send) => {
        const worker = async () => {
          while (!transportError && queue.length > 0) {
            if (Date.now() - startedAt > BATCH_TIME_BUDGET_MS) return;
            const row = queue.shift()!;
            const result = await send(newsletterMessage(content, row, branding));

            if (isTransportFailure(result)) {
              transportError ??= result.ok ? "Mail server error" : result.error;
              return;
            }
            unsent.delete(row.id);
            if (result.ok) {
              await prisma.newsletterDelivery.update({
                where: { id: row.id },
                data: { status: "SENT", sentAt: new Date(), error: null },
              });
            } else {
              await prisma.newsletterDelivery.update({
                where: { id: row.id },
                data: {
                  status: result.error === "suppressed" ? "SKIPPED" : "FAILED",
                  error: result.error.slice(0, 500),
                },
              });
            }
          }
        };
        await Promise.all(Array.from({ length: SEND_CONCURRENCY }, worker));
      });
    }

    // Out of time or the mail server went away: hand the rest back for the next batch.
    if (unsent.size > 0) {
      await prisma.newsletterDelivery.updateMany({
        where: { id: { in: [...unsent] }, status: "SENDING" },
        data: { status: "PENDING", claimedAt: null },
      });
    }
  }

  const progress = await finalizeIfComplete(campaignId);
  const updated = progress.done ? await findCampaign(organizationId, campaignId) : campaign;

  if (transportError) {
    return {
      ok: false as const,
      error: `Sending paused, the mail server returned an error: ${transportError}`,
      status: 502,
      progress,
    };
  }
  return { ok: true as const, campaign: updated!, progress, claimed: claimed.length };
}

/** Sends one copy of a campaign to `to` (the admin), marked as a test. */
export async function sendNewsletterTest(organizationId: string, campaignId: string, to: string) {
  if (!canSendEmail()) return EMAIL_NOT_CONFIGURED;

  const campaign = await findCampaign(organizationId, campaignId);
  if (!campaign) return { ok: false as const, error: "Campaign not found", status: 404 };

  const branding = await getEmailBranding();
  const rendered = newsletterEmail(branding, campaign, { test: true });
  const result = await sendEmail({
    to,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    category: "newsletter",
  });
  if (!result.ok) {
    return { ok: false as const, error: `Test email failed: ${result.error}`, status: 502 };
  }
  return { ok: true as const, to, mode: result.mode };
}
