import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { enrollUserInRoadmap } from "@/lib/roadmaps";

export async function POST(request: Request) {
  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;
  if (!tenant.member) return jsonError("Not a member of this institute", 403);

  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const roadmapId =
    typeof body.roadmapId === "string" ? body.roadmapId.trim() : "";
  if (!roadmapId) return jsonError("roadmapId is required", 400);

  const result = await enrollUserInRoadmap(
    session.user.id,
    tenant.member.role,
    roadmapId,
    tenant.organizationId,
  );

  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  return Response.json({
    roadmapSlug: result.roadmapSlug,
    roleChanged: result.roleChanged,
    alreadyEnrolled: result.alreadyEnrolled,
    coursesEnrolled: result.coursesEnrolled,
  });
}
