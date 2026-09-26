import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  oneClickUnsubscribeUrl,
  signUnsubscribeToken,
  unsubscribePageUrl,
  verifyUnsubscribeToken,
} from "@/lib/unsubscribe-token";

beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-that-is-long-enough-1234567890");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lms.example.com");
});

describe("unsubscribe tokens", () => {
  it("verifies its own signature", () => {
    const token = signUnsubscribeToken("sub_123");
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(verifyUnsubscribeToken("sub_123", token)).toBe(true);
  });

  it("rejects a token for another subscriber or a tampered token", () => {
    const token = signUnsubscribeToken("sub_123");
    expect(verifyUnsubscribeToken("sub_124", token)).toBe(false);
    expect(verifyUnsubscribeToken("sub_123", `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`)).toBe(false);
    expect(verifyUnsubscribeToken("sub_123", "")).toBe(false);
    expect(verifyUnsubscribeToken("", token)).toBe(false);
    expect(verifyUnsubscribeToken("x".repeat(65), token)).toBe(false);
  });

  it("stops verifying after the secret rotates", () => {
    const token = signUnsubscribeToken("sub_123");
    vi.stubEnv("BETTER_AUTH_SECRET", "a-different-secret-that-is-long-enough-000");
    expect(verifyUnsubscribeToken("sub_123", token)).toBe(false);
  });

  it("requires a secret in production", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => signUnsubscribeToken("sub_123")).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("builds absolute links carrying the subscriber and token", () => {
    const page = new URL(unsubscribePageUrl("sub_123"));
    expect(page.origin).toBe("https://lms.example.com");
    expect(page.pathname).toBe("/unsubscribe");
    expect(verifyUnsubscribeToken(page.searchParams.get("s")!, page.searchParams.get("t")!)).toBe(true);

    const oneClick = new URL(oneClickUnsubscribeUrl("sub_123"));
    expect(oneClick.pathname).toBe("/api/newsletter/unsubscribe");
    expect(oneClick.searchParams.get("s")).toBe("sub_123");
  });
});
