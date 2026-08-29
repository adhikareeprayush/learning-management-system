import { prisma } from "@/lib/db";
import { jsonError, requireSession } from "@/lib/api";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.user.role !== "ADMIN") return jsonError("Forbidden", 403);
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, image: true, role: true, emailVerified: true, createdAt: true, _count: { select: { enrollments: true, courseTeaching: true } } },
  });
  return Response.json({ users });
}
