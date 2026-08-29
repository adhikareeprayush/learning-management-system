import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";

export async function GET() {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "STUDENT") return jsonError("Forbidden", 403);

  const certificates = await prisma.certificate.findMany({
    where: { studentId: session.user.id },
    orderBy: { issuedAt: "desc" },
    include: {
      course: {
        select: {
          title: true,
          slug: true,
          instructor: { select: { name: true } },
        },
      },
    },
  });

  return Response.json({ certificates });
}
