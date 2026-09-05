import { jsonError, requireOrgAdminApi } from "@/lib/api";
import {
  createNewsletterCampaign,
  listNewsletterCampaigns,
  sendNewsletterCampaign,
} from "@/lib/newsletter";

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

  if (action === "send") {
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
    if (!campaignId) return jsonError("campaignId is required", 400);

    const result = await sendNewsletterCampaign(auth.organizationId, campaignId);
    if (!result.ok) return jsonError(result.error, result.status);

    return Response.json({
      campaign: result.campaign,
      recipientCount: result.recipientCount,
    });
  }

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
