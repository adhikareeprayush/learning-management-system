import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireOrgAdminApi } from "@/lib/api";

const ROLES: Role[] = ["ADMIN", "INSTRUCTOR", "STUDENT"];
const MAX_PAGE_SIZE = 100;

export async function GET(request: Request) {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim().slice(0, 200);
  const role = ROLES.find((value) => value === params.get("role")?.toUpperCase());
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(params.get("pageSize"))) || 25),
  );
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
  ]);

  return Response.json({
    users,
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });
}
