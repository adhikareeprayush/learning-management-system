import { afterEach, describe, expect, it, vi } from "vitest";
import { allowHit, clientIp, hashClientIp, honeypotTripped } from "@/lib/emails/form-guard";

const request = (headers: Record<string, string>) => new Request("https://lms.example.com/api/contact", { headers });

afterEach(() => {
  vi.useRealTimers();
});

describe("client IP", () => {
  it("prefers the first x-forwarded-for hop, then x-real-ip", () => {
    expect(clientIp(request({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(clientIp(request({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(request({}))).toBeNull();
  });

  it("hashes the IP so it is never stored raw", () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-that-is-long-enough-1234567890");
    const hash = hashClientIp(request({ "x-forwarded-for": "203.0.113.7" }));
    expect(hash).toHaveLength(32);
    expect(hash).not.toContain("203.0.113.7");
    expect(hashClientIp(request({ "x-real-ip": "203.0.113.7" }))).toBe(hash);
    expect(hashClientIp(request({}))).toBeNull();
  });
});

describe("honeypotTripped", () => {
  it("trips only on a filled hidden field", () => {
    expect(honeypotTripped("https://spam.example")).toBe(true);
    expect(honeypotTripped("   ")).toBe(false);
    expect(honeypotTripped(undefined)).toBe(false);
    expect(honeypotTripped(null)).toBe(false);
  });
});

describe("allowHit", () => {
  it("allows `limit` hits per window, then resets", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const key = `test:${Math.random()}`;

    expect(allowHit(key, 2, 60_000)).toBe(true);
    expect(allowHit(key, 2, 60_000)).toBe(true);
    expect(allowHit(key, 2, 60_000)).toBe(false);
    expect(allowHit(`${key}:other`, 2, 60_000)).toBe(true);

    vi.setSystemTime(new Date("2026-01-01T00:01:01Z"));
    expect(allowHit(key, 2, 60_000)).toBe(true);
  });
});
