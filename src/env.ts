/**
 * Startup environment checks, run once per server from src/instrumentation.ts.
 * Missing required values throw in production and only warn in development;
 * optional integrations (uploads, email) only ever warn.
 */

type Env = Record<string, string | undefined>;

export type EnvReport = { errors: string[]; warnings: string[] };

function value(env: Env, name: string) {
  return env[name]?.trim() || "";
}

function isHttpUrl(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isLocalhost(raw: string) {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(raw).hostname);
  } catch {
    return false;
  }
}

/** Mirrors the rule in src/lib/auth.ts so the failure shows up at boot. */
export function isWeakAuthSecret(secret: string) {
  return secret.length < 32 || /change-me|docker-dev/i.test(secret);
}

export function checkServerEnv(env: Env = process.env): EnvReport {
  const production = env.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];

  const databaseUrl = value(env, "DATABASE_URL");
  if (!databaseUrl) {
    errors.push("DATABASE_URL is not set.");
  } else if (!/^postgres(ql)?:\/\//i.test(databaseUrl)) {
    errors.push("DATABASE_URL must be a postgresql:// connection string.");
  }

  const secret = value(env, "BETTER_AUTH_SECRET");
  if (!secret) {
    errors.push("BETTER_AUTH_SECRET is not set (generate one with `openssl rand -base64 32`).");
  } else if (production && isWeakAuthSecret(secret)) {
    errors.push("BETTER_AUTH_SECRET must be a random value of at least 32 characters.");
  }

  const appUrls = ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"].filter((name) => value(env, name));
  for (const name of appUrls) {
    const url = value(env, name);
    if (!isHttpUrl(url)) {
      errors.push(`${name} must be an absolute http(s) URL, e.g. https://lms.example.com.`);
    } else if (production && url.startsWith("http://") && !isLocalhost(url)) {
      warnings.push(`${name} uses http://; auth cookies need https in production.`);
    }
  }
  if (appUrls.length === 0) {
    if (value(env, "VERCEL_URL")) {
      warnings.push(
        "BETTER_AUTH_URL / NEXT_PUBLIC_APP_URL are not set; links fall back to VERCEL_URL. Set them to your public domain.",
      );
    } else {
      errors.push("Set BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL to the app's public URL.");
    }
  }

  if (!production) return { errors, warnings };

  const imagekitMissing = [
    "IMAGEKIT_PUBLIC_KEY",
    "IMAGEKIT_PRIVATE_KEY",
    ...(value(env, "IMAGEKIT_URL_ENDPOINT") || value(env, "NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT")
      ? []
      : ["IMAGEKIT_URL_ENDPOINT"]),
  ].filter((name) => !value(env, name));
  if (imagekitMissing.length > 0) {
    warnings.push(
      `${imagekitMissing.join(", ")} not set: file uploads (avatars, thumbnails, payment screenshots) are disabled.`,
    );
  }

  const smtp = Boolean(value(env, "SMTP_HOST"));
  if (!smtp) {
    warnings.push(
      "SMTP_HOST is not set: no email is sent (password resets, verification, notifications, newsletters).",
    );
  } else if (!value(env, "EMAIL_FROM")) {
    warnings.push("EMAIL_FROM is not set: SMTP sends will fail.");
  }
  if (value(env, "EMAIL_TRANSPORT") === "console") {
    warnings.push("EMAIL_TRANSPORT=console prints emails, including reset links, to the logs.");
  }
  if (value(env, "AUTH_REQUIRE_EMAIL_VERIFICATION") === "true" && !smtp) {
    warnings.push(
      "AUTH_REQUIRE_EMAIL_VERIFICATION=true without SMTP: new accounts cannot verify their email.",
    );
  }
  if (value(env, "NEXT_PUBLIC_DEMO_MODE") === "true") {
    warnings.push("NEXT_PUBLIC_DEMO_MODE=true: demo credentials are shown on the sign-in page.");
  }

  return { errors, warnings };
}

export function assertServerEnv(env: Env = process.env) {
  // `next build` evaluates server code without runtime secrets.
  if (env.NEXT_PHASE === "phase-production-build") return;

  const { errors, warnings } = checkServerEnv(env);
  for (const warning of warnings) console.warn(`[env] ${warning}`);
  if (errors.length === 0) return;

  const message = `Invalid environment:\n  - ${errors.join("\n  - ")}`;
  if (env.NODE_ENV === "production") throw new Error(message);
  console.warn(`[env] ${message}`);
}
