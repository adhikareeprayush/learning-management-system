import type { NewsletterCampaignStatus, NewsletterSubscriberStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const campaignInclude = {
  createdBy: { select: { id: true, name: true, email: true } },
} as const;

export function isValidNewsletterEmail(email: string) {
  return EMAIL_RE.test(email);
}

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
 * No email provider is configured, so this only records the campaign as sent
 * (with the active-subscriber count at that moment). It does not deliver email.
 */
export async function markNewsletterCampaignSent(organizationId: string, campaignId: string) {
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
