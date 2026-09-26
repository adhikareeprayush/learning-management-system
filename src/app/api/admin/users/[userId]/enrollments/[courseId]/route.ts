import { jsonError, requireOrgAdminApi } from "@/lib/api";
import { notifyEnrollmentChanged } from "@/lib/email-notifications";
import {
  getAdminUser,
  getAdminUserActivity,
  revokeEnrollment,
  UserAdminError,
  userAdminErrorResponse,
} from "@/lib/user-admin";

type Params = { params: Promise<{ userId: string; courseId: string }> };

/** Revoke course access. Progress and payments are kept (see revokeEnrollment). */
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const { userId, courseId } = await params;

  try {
    const { course, hasCompletedPayment } = await revokeEnrollment(
      auth.organizationId,
      userId,
      courseId,
    );
    notifyEnrollmentChanged({ userId, courseId: course.id, change: "revoked" });

    const [user, activity] = await Promise.all([
      getAdminUser(auth.organizationId, userId),
      getAdminUserActivity(auth.organizationId, userId),
    ]);
    return Response.json({ ok: true, hasCompletedPayment, user, ...activity });
  } catch (error) {
    if (error instanceof UserAdminError) return userAdminErrorResponse(error);
    console.error("DELETE /api/admin/users/[userId]/enrollments/[courseId]", error);
    return jsonError("Could not revoke access", 500);
  }
}
