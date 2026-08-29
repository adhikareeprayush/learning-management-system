import { jsonError, requireSession } from "@/lib/api";
import {
  createNewsletterCampaign,
  listNewsletterCampaigns,
  sendNewsletterCampaign,
} from "@/lib/newsletter";

export async function GET() {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const campaigns = await listNewsletterCampaigns();
  return Response.json({ campaigns });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "create";

  if (action === "send") {
    const campaignId = typeof body.campaignId === "string" ? body.campaignId : "";
    if (!campaignId) return jsonError("campaignId is required", 400);

    const result = await sendNewsletterCampaign(campaignId);
    if (!result.ok) return jsonError(result.error, result.status);

    return Response.json({
      campaign: result.campaign,
      recipientCount: result.recipientCount,
    });
  }

  const subject = typeof body.subject === "string" ? body.subject : "";
  const messageBody = typeof body.body === "string" ? body.body : "";

  const result = await createNewsletterCampaign({
    subject,
    body: messageBody,
    createdById: session.user.id,
  });

  if (!result.ok) return jsonError(result.error, result.status);

  return Response.json({ campaign: result.campaign }, { status: 201 });
}
