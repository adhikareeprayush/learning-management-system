import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

function buildTrustedOrigins() {
  const origins = new Set<string>();
  const envOrigins = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.BETTER_AUTH_TRUSTED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","));

  for (const origin of envOrigins) {
    const trimmed = origin.trim();
    if (trimmed) origins.add(trimmed);
  }

  if (process.env.NODE_ENV === "development") {
    origins.add("http://localhost:3005");
  }

  return [...origins];
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: buildTrustedOrigins(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  plugins: [nextCookies()],
});

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
