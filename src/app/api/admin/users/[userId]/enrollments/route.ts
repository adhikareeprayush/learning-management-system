import { cleanString, jsonError, requireOrgAdminApi } from "@/lib/api";
import { notifyEnrollmentChanged } from "@/lib/email-notifications";
import {
  getAdminUser,
  getAdminUserActivity,
  grantEnrollment,
  UserAdminError,
  userAdminErrorResponse,
} from "@/lib/user-admin";

type Params = { params: Promise<{ userId: string }> };

/** Grant course access without a payment. Idempotent. Body: { courseId }. */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { userId } = await params;
  const body = (await request.json().catch(() => null)) as { courseId?: unknown } | null;
  const courseId = cleanString(body?.courseId, 80);
  if (!courseId) return jsonError("courseId is required", 400);

  try {
    const { created, course } = await grantEnrollment(auth.organizationId, userId, courseId);
    if (created) {
      notifyEnrollmentChanged({ userId, courseId: course.id, change: "granted" });
    }

    const [user, activity] = await Promise.all([
      getAdminUser(auth.organizationId, userId),
      getAdminUserActivity(auth.organizationId, userId),
    ]);
    return Response.json({ created, user, ...activity }, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof UserAdminError) return userAdminErrorResponse(error);
    console.error("POST /api/admin/users/[userId]/enrollments", error);
    return jsonError("Could not grant access", 500);
  }
}
