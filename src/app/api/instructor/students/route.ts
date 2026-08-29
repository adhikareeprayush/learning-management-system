import { prisma } from "@/lib/db";
import { isTeacher, jsonError, requireSession } from "@/lib/api";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!isTeacher(session)) return jsonError("Forbidden", 403);
  const courseId = new URL(request.url).searchParams.get("courseId") || undefined;
  const enrollments = await prisma.enrollment.findMany({
    where: { ...(courseId ? { courseId } : {}), ...(session.user.role === "INSTRUCTOR" ? { course: { instructorId: session.user.id } } : {}) },
    orderBy: { enrolledAt: "desc" },
    include: { student: { select: { id: true, name: true, email: true, image: true } }, course: { select: { id: true, title: true, slug: true } } },
  });
  return Response.json({ enrollments });
}
