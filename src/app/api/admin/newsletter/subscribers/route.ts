import { jsonError, requireSession } from "@/lib/api";
import { listNewsletterSubscribers, unsubscribeNewsletter } from "@/lib/newsletter";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() || undefined;
  const statusParam = params.get("status");
  const status =
    statusParam === "ACTIVE" || statusParam === "UNSUBSCRIBED"
      ? statusParam
      : undefined;

  const subscribers = await listNewsletterSubscribers({ q, status });
  return Response.json({ subscribers });
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";

  if (!email) {
    return jsonError("email is required", 400);
  }

  const result = await unsubscribeNewsletter(email);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return Response.json({ subscriber: result.subscriber });
}
