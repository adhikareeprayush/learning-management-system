import { jsonError, requireSession, requireTenantApi } from "@/lib/api";
import { staffEnrollBlock } from "@/lib/enrollments";
import { enrollUserInRoadmap } from "@/lib/roadmaps";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);

  const tenant = await requireTenantApi();
  if (tenant instanceof Response) return tenant;

  const body = await request.json().catch(() => ({}));
  const roadmapId =
    typeof body.roadmapId === "string" ? body.roadmapId.trim() : "";
  if (!roadmapId) return jsonError("roadmapId is required", 400);

  const staff = await staffEnrollBlock(
    session.user,
    { kind: "roadmap", id: roadmapId },
    tenant.organizationId,
  );
  if (staff) return Response.json({ error: staff.message, staff }, { status: 403 });

  // Membership is created on demand by enrollUserInCourse.
  const result = await enrollUserInRoadmap(
    session.user.id,
    tenant.member?.role ?? null,
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
    enrolledCount: result.enrolledCount,
    paymentRequiredCount: result.paymentRequiredCount,
    courses: result.courses,
  });
}
