import { createHmac, timingSafeEqual } from "node:crypto";
import { appUrl } from "@/lib/app-url";

/*
 * Stateless newsletter unsubscribe links: HMAC of the subscriber id keyed by
 * BETTER_AUTH_SECRET. Links never expire; rotating the secret invalidates every
 * link in already-sent newsletters (subscribers can still use newer emails).
 */

const DEV_SECRET = "dev-only-unsubscribe-secret";

function secret() {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be set to sign unsubscribe links");
  }
  return DEV_SECRET;
}

export function signUnsubscribeToken(subscriberId: string) {
  return createHmac("sha256", secret())
    .update(`newsletter-unsub:v1:${subscriberId}`)
    .digest("base64url");
}

export function verifyUnsubscribeToken(subscriberId: string, token: string) {
  if (!subscriberId || !token || subscriberId.length > 64 || token.length > 128) return false;
  const expected = Buffer.from(signUnsubscribeToken(subscriberId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function query(subscriberId: string) {
  return new URLSearchParams({ s: subscriberId, t: signUnsubscribeToken(subscriberId) }).toString();
}

/** Human-facing confirm page (safe for link scanners: GET never unsubscribes). */
export function unsubscribePageUrl(subscriberId: string) {
  return appUrl(`/unsubscribe?${query(subscriberId)}`);
}

/** RFC 8058 List-Unsubscribe target; mail clients POST to it. */
export function oneClickUnsubscribeUrl(subscriberId: string) {
  return appUrl(`/api/newsletter/unsubscribe?${query(subscriberId)}`);
}
