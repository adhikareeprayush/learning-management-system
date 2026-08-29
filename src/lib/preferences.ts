import { prisma } from "@/lib/db";

export async function getUserPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });
  if (!user?.preferences || typeof user.preferences !== "object" || Array.isArray(user.preferences)) {
    return {} as Record<string, boolean>;
  }
  return Object.fromEntries(
    Object.entries(user.preferences).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"),
  );
}
