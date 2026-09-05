import { jsonError, requireOrgAdminApi } from "@/lib/api";
import { listNewsletterSubscribers, unsubscribeNewsletter } from "@/lib/newsletter";

export async function GET(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() || undefined;
  const statusParam = params.get("status");
  const status =
    statusParam === "ACTIVE" || statusParam === "UNSUBSCRIBED"
      ? statusParam
      : undefined;

  const subscribers = await listNewsletterSubscribers(auth.organizationId, { q, status });
  return Response.json({ subscribers });
}

export async function DELETE(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";

  if (!email) {
    return jsonError("email is required", 400);
  }

  const result = await unsubscribeNewsletter(auth.organizationId, email);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return Response.json({ subscriber: result.subscriber });
}
