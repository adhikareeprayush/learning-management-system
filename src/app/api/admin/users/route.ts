import { prisma } from "@/lib/db";
import { requireOrgAdminApi } from "@/lib/api";

export async function GET(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const q = new URL(request.url).searchParams.get("q")?.trim();
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { enrollments: true, courseTeaching: true } },
    },
  });

  return Response.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      _count: user._count,
    })),
  });
}
