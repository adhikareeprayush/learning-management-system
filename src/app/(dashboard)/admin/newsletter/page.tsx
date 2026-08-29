import { prisma } from "@/lib/db";
import AdminNewsletterClient from "./newsletter-client";

export default async function AdminNewsletterPage() {
  const [subscribers, campaigns] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: "desc" },
    }),
    prisma.newsletterCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return (
    <AdminNewsletterClient
      initialSubscribers={subscribers.map((subscriber) => ({
        id: subscriber.id,
        email: subscriber.email,
        name: subscriber.name,
        status: subscriber.status,
        source: subscriber.source,
        subscribedAt: subscriber.subscribedAt.toISOString(),
        unsubscribedAt: subscriber.unsubscribedAt?.toISOString() ?? null,
      }))}
      initialCampaigns={campaigns.map((campaign) => ({
        id: campaign.id,
        subject: campaign.subject,
        body: campaign.body,
        status: campaign.status,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        recipientCount: campaign.recipientCount,
        createdAt: campaign.createdAt.toISOString(),
        createdBy: campaign.createdBy,
      }))}
    />
  );
}
