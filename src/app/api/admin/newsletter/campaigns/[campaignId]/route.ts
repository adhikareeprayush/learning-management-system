import { jsonError, requireOrgAdminApi } from "@/lib/api";
import { deleteNewsletterCampaign, updateNewsletterCampaign } from "@/lib/newsletter";

type Params = { params: Promise<{ campaignId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { campaignId } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return jsonError("Invalid JSON body", 400);

  const subject = body.subject;
  const messageBody = body.body;
  if (
    (subject !== undefined && typeof subject !== "string") ||
    (messageBody !== undefined && typeof messageBody !== "string")
  ) {
    return jsonError("subject and body must be text", 400);
  }

  const result = await updateNewsletterCampaign(auth.organizationId, campaignId, {
    subject,
    body: messageBody,
  });
  if (!result.ok) return jsonError(result.error, result.status);

  return Response.json({ campaign: result.campaign });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { campaignId } = await params;
  const result = await deleteNewsletterCampaign(auth.organizationId, campaignId);
  if (!result.ok) return jsonError(result.error, result.status);

  return new Response(null, { status: 204 });
}
