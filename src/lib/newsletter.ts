import type { NewsletterCampaignStatus, NewsletterSubscriberStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidNewsletterEmail(email: string) {
  return EMAIL_RE.test(email);
}

export async function subscribeToNewsletter(input: {
  email: string;
  name?: string | null;
  source?: string;
}) {
  const email = input.email.trim().toLowerCase();
  if (!isValidNewsletterEmail(email)) {
    return { ok: false as const, error: "Enter a valid email address", status: 400 };
  }

  const existing = await prisma.newsletterSubscriber.findUnique({ where: { email } });

  if (existing?.status === "ACTIVE") {
    return { ok: true as const, alreadySubscribed: true, subscriber: existing };
  }

  const subscriber = existing
    ? await prisma.newsletterSubscriber.update({
        where: { email },
        data: {
          status: "ACTIVE",
          name: input.name?.trim() || existing.name,
          source: input.source?.trim() || existing.source,
          unsubscribedAt: null,
        },
      })
    : await prisma.newsletterSubscriber.create({
        data: {
          email,
          name: input.name?.trim() || null,
          source: input.source?.trim() || "footer",
        },
      });

  return { ok: true as const, alreadySubscribed: false, subscriber };
}

export async function unsubscribeNewsletter(email: string) {
  const normalized = email.trim().toLowerCase();
  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: normalized },
  });

  if (!existing) {
    return { ok: false as const, error: "Subscriber not found", status: 404 };
  }

  if (existing.status === "UNSUBSCRIBED") {
    return { ok: true as const, subscriber: existing };
  }

  const subscriber = await prisma.newsletterSubscriber.update({
    where: { email: normalized },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });

  return { ok: true as const, subscriber };
}

export async function listNewsletterSubscribers(filters?: {
  status?: NewsletterSubscriberStatus;
  q?: string;
}) {
  const q = filters?.q?.trim();
  return prisma.newsletterSubscriber.findMany({
    where: {
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

export async function listNewsletterCampaigns() {
  return prisma.newsletterCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function createNewsletterCampaign(input: {
  subject: string;
  body: string;
  createdById: string;
}) {
  const subject = input.subject.trim();
  const body = input.body.trim();

  if (!subject) {
    return { ok: false as const, error: "Subject is required", status: 400 };
  }
  if (!body) {
    return { ok: false as const, error: "Message body is required", status: 400 };
  }

  const campaign = await prisma.newsletterCampaign.create({
    data: {
      subject,
      body,
      createdById: input.createdById,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { ok: true as const, campaign };
}

export async function sendNewsletterCampaign(campaignId: string) {
  const campaign = await prisma.newsletterCampaign.findUnique({
    where: { id: campaignId },
  });

  if (!campaign) {
    return { ok: false as const, error: "Campaign not found", status: 404 };
  }

  if (campaign.status === "SENT") {
    return { ok: false as const, error: "Campaign was already sent", status: 409 };
  }

  const activeCount = await prisma.newsletterSubscriber.count({
    where: { status: "ACTIVE" },
  });

  const updated = await prisma.newsletterCampaign.update({
    where: { id: campaignId },
    data: {
      status: "SENT" satisfies NewsletterCampaignStatus,
      sentAt: new Date(),
      recipientCount: activeCount,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return { ok: true as const, campaign: updated, recipientCount: activeCount };
}
