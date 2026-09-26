import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getEmailMode } from "@/lib/email";
import {
  listNewsletterCampaigns,
  listNewsletterSendProgress,
  listNewsletterSubscribers,
} from "@/lib/newsletter";
import { loginRedirectPath, requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import AdminNewsletterClient from "./newsletter-client";

export const metadata: Metadata = { title: "Newsletter" };

export default async function AdminNewsletterPage() {
  const session = await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const [subscribers, campaigns] = await Promise.all([
    listNewsletterSubscribers(ctx.organizationId),
    listNewsletterCampaigns(ctx.organizationId),
  ]);
  const progress = await listNewsletterSendProgress(
    campaigns.filter((campaign) => campaign.status === "SENDING").map((campaign) => campaign.id),
  );

  return (
    <AdminNewsletterClient
      emailMode={getEmailMode()}
      adminEmail={session.user.email}
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
        startedAt: campaign.startedAt?.toISOString() ?? null,
        sentAt: campaign.sentAt?.toISOString() ?? null,
        recipientCount: campaign.recipientCount,
        failedCount: campaign.failedCount,
        createdAt: campaign.createdAt.toISOString(),
        createdBy: campaign.createdBy,
      }))}
      initialProgress={Object.fromEntries(progress)}
    />
  );
}
