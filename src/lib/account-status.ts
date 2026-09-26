import { APIError } from "better-auth/api";
import { prisma } from "@/lib/db";

/** Blocks new sessions for suspended or deleted accounts (better-auth session hook). */
export async function assertSessionAllowed(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { disabledAt: true },
  });
  if (user?.disabledAt) {
    throw APIError.from("FORBIDDEN", {
      code: "ACCOUNT_SUSPENDED",
      message: "This account has been suspended. Contact support.",
    });
  }
}
