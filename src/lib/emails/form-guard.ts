import { createHmac } from "node:crypto";

/*
 * Light abuse protection for public forms that trigger email (contact,
 * newsletter). Not a substitute for a shared rate limiter: the in-memory
 * windows are per server instance.
 */

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || null;
}

/** Keyed hash so stored rows never hold raw IP addresses. */
export function hashClientIp(request: Request) {
  const ip = clientIp(request);
  if (!ip) return null;
  const key = process.env.BETTER_AUTH_SECRET?.trim() || "dev-only-ip-hash";
  return createHmac("sha256", key).update(`client-ip:v1:${ip}`).digest("base64url").slice(0, 32);
}

/** Bots fill every field; people never see this one. */
export function honeypotTripped(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

type Window = { count: number; resetAt: number };

const MAX_KEYS = 5_000;
const globalForGuard = globalThis as unknown as { formGuardWindows?: Map<string, Window> };
const windows = (globalForGuard.formGuardWindows ??= new Map());

/** Counts one hit against `key`; false once `limit` hits land inside `windowMs`. */
export function allowHit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = windows.get(key);
  if (current && current.resetAt > now) {
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  }

  windows.delete(key);
  if (windows.size >= MAX_KEYS) {
    // Maps iterate in insertion order, so this drops the oldest windows first.
    for (const staleKey of windows.keys()) {
      windows.delete(staleKey);
      if (windows.size < MAX_KEYS * 0.9) break;
    }
  }
  windows.set(key, { count: 1, resetAt: now + windowMs });
  return true;
}
