import { cache } from "react";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { after } from "next/server";
import { headers } from "next/headers";
import { assertSessionAllowed } from "@/lib/account-status";
import { prisma } from "@/lib/db";
import { canSendEmail } from "@/lib/email";
import {
  EMAIL_VERIFICATION_TTL_SECONDS,
  RESET_PASSWORD_TOKEN_TTL_SECONDS,
  sendPasswordChangedNotice,
  sendResetPasswordEmail,
  sendVerifyEmail,
} from "@/lib/emails/auth-emails";

const emailOn = canSendEmail();
// Blocking unverified sign-ins without a working mailer would lock everyone out.
const requireVerification =
  emailOn && process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";

function authSecret() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const weak =
    !secret || secret.length < 32 || /change-me|docker-dev/i.test(secret);
  // `next build` evaluates this module without runtime secrets; only refuse to serve.
  if (
    weak &&
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    throw new Error(
      "BETTER_AUTH_SECRET must be a random value of at least 32 characters in production.",
    );
  }
  return secret;
}

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
  secret: authSecret(),
  trustedOrigins: buildTrustedOrigins(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: requireVerification,
    resetPasswordTokenExpiresIn: RESET_PASSWORD_TOKEN_TTL_SECONDS,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user, url);
    },
    onPasswordReset: async ({ user }) => {
      sendPasswordChangedNotice(user);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerifyEmail(user, url);
    },
    sendOnSignUp: emailOn,
    // Not sendOnSignIn: its link needs sign-in's callbackURL, which would also
    // redirect successful sign-ins. The login form offers "send a new link".
    autoSignInAfterVerification: true,
    expiresIn: EMAIL_VERIFICATION_TTL_SECONDS,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false,
      },
      // Edited through /api/profile, which validates it.
      bio: {
        type: "string",
        required: false,
        input: false,
      },
      disabledAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  // Counters live in Postgres so limits hold across serverless instances.
  rateLimit: {
    storage: "database",
    modelName: "rateLimit",
  },
  advanced: {
    // Auth emails (reset, verification) are sent after the response so timing
    // doesn't reveal whether an account exists.
    backgroundTasks: {
      handler: (task) => {
        try {
          after(task);
        } catch {
          void task;
        }
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          await assertSessionAllowed(session.userId);
        },
      },
    },
  },
  plugins: [nextCookies()],
});

/** Current session, memoized per request. Suspended accounts read as signed out. */
export const getServerSession = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session?.user.disabledAt) return null;
  return session;
});
