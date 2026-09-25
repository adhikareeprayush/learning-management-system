import { redirect } from "next/navigation";
import { listNewsletterCampaigns, listNewsletterSubscribers } from "@/lib/newsletter";
import { requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import AdminNewsletterClient from "./newsletter-client";

export default async function AdminNewsletterPage() {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const [subscribers, campaigns] = await Promise.all([
    listNewsletterSubscribers(ctx.organizationId),
    listNewsletterCampaigns(ctx.organizationId),
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
