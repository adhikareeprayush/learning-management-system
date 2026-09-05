import { prisma } from "@/lib/db";
import { jsonError, requireTeacherApi } from "@/lib/api";
import { isOrgAdmin } from "@/lib/tenant";

export async function GET(request: Request) {
  const auth = await requireTeacherApi();
  if (auth instanceof Response) return auth;

  const courseId = new URL(request.url).searchParams.get("courseId") || undefined;
  const enrollments = await prisma.enrollment.findMany({
    where: {
      ...(courseId ? { courseId } : {}),
      course: {
        organizationId: auth.organizationId,
        ...(isOrgAdmin(auth.member) ? {} : { instructorId: auth.session.user.id }),
      },
    },
    orderBy: { enrolledAt: "desc" },
    include: {
      student: { select: { id: true, name: true, email: true, image: true } },
      course: { select: { id: true, title: true, slug: true } },
    },
  });
  return Response.json({ enrollments });
}
