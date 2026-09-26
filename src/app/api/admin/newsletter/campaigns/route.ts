import { jsonError, requireOrgAdminApi } from "@/lib/api";
import {
  createNewsletterCampaign,
  listNewsletterCampaigns,
  markNewsletterCampaignSent,
  sendNewsletterBatch,
  sendNewsletterTest,
  startNewsletterCampaign,
} from "@/lib/newsletter";

// Each send_batch call works for up to ~20 s (see sendNewsletterBatch).
export const maxDuration = 60;

function failure(result: { error: string; status: number; code?: string; progress?: unknown }) {
  return Response.json(
    {
      error: result.error,
      ...(result.code ? { code: result.code } : {}),
      ...(result.progress ? { progress: result.progress } : {}),
    },
    { status: result.status },
  );
}

export async function GET() {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const campaigns = await listNewsletterCampaigns(auth.organizationId);
  return Response.json({ campaigns });
}

export async function POST(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "create";
  const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";

  if (action === "send" || action === "send_batch" || action === "send_test" || action === "mark_sent") {
    if (!campaignId) return jsonError("campaignId is required", 400);
  }

  // Only when email isn't configured: records the campaign as sent without delivering it.
  if (action === "mark_sent") {
    const result = await markNewsletterCampaignSent(auth.organizationId, campaignId);
    if (!result.ok) return failure(result);

    return Response.json({
      campaign: result.campaign,
      recipientCount: result.recipientCount,
      delivered: false,
    });
  }

  // Queues the campaign; the client then calls send_batch until progress.done.
  if (action === "send") {
    const result = await startNewsletterCampaign(auth.organizationId, campaignId);
    if (!result.ok) return failure(result);
    return Response.json({ campaign: result.campaign, progress: result.progress });
  }

  if (action === "send_batch") {
    const result = await sendNewsletterBatch(auth.organizationId, campaignId);
    if (!result.ok) return failure(result);
    return Response.json({
      campaign: result.campaign,
      progress: result.progress,
      claimed: result.claimed,
    });
  }

  if (action === "send_test") {
    const result = await sendNewsletterTest(
      auth.organizationId,
      campaignId,
      auth.session.user.email,
    );
    if (!result.ok) return failure(result);
    return Response.json({ sent: true, to: result.to, mode: result.mode });
  }

  if (action !== "create") return jsonError("Unknown action", 400);

  const subject = typeof body.subject === "string" ? body.subject : "";
  const messageBody = typeof body.body === "string" ? body.body : "";

  const result = await createNewsletterCampaign({
    organizationId: auth.organizationId,
    subject,
    body: messageBody,
    createdById: auth.session.user.id,
  });

  if (!result.ok) return jsonError(result.error, result.status);

  return Response.json({ campaign: result.campaign }, { status: 201 });
}
