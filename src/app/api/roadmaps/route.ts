import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { listPublishedRoadmaps } from "@/lib/roadmaps";

export async function GET() {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const session = await requireSession();
  const roadmaps = await listPublishedRoadmaps(
    tenant.organizationId,
    session?.user.id ?? null,
  );
  return Response.json({ roadmaps });
}
