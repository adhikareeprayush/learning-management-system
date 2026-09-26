import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ prisma: {} }));
vi.mock("@/lib/payment-methods", () => ({ getPaymentMethodById: vi.fn() }));

import { isTrustedPaymentScreenshotUrl } from "@/lib/payments";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", "https://ik.imagekit.io/demo");
  vi.stubEnv("IMAGEKIT_URL_ENDPOINT", "");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lms.example.com");
  vi.stubEnv("BETTER_AUTH_URL", "");
});

describe("isTrustedPaymentScreenshotUrl", () => {
  it("trusts files on the configured ImageKit endpoint", () => {
    expect(isTrustedPaymentScreenshotUrl("https://ik.imagekit.io/demo/payment-screenshots/a.png")).toBe(true);
  });

  it("rejects other ImageKit accounts and third-party hosts", () => {
    expect(isTrustedPaymentScreenshotUrl("https://ik.imagekit.io/demox/a.png")).toBe(false);
    expect(isTrustedPaymentScreenshotUrl("https://ik.imagekit.io/other/a.png")).toBe(false);
    expect(isTrustedPaymentScreenshotUrl("https://evil.example/a.png")).toBe(false);
  });

  it("trusts /uploads/ on the app's own origin", () => {
    expect(isTrustedPaymentScreenshotUrl("https://lms.example.com/uploads/p/a.png")).toBe(true);
    expect(isTrustedPaymentScreenshotUrl("/uploads/p/a.png", "http://localhost:3005")).toBe(true);
    expect(isTrustedPaymentScreenshotUrl("https://lms.example.com/images/a.png")).toBe(false);
  });

  it("rejects credentials and non-http schemes", () => {
    expect(isTrustedPaymentScreenshotUrl("https://u:p@ik.imagekit.io/demo/a.png")).toBe(false);
    expect(isTrustedPaymentScreenshotUrl("javascript:alert(1)")).toBe(false);
    expect(isTrustedPaymentScreenshotUrl("data:image/png;base64,AAAA")).toBe(false);
  });

  it("trusts nothing on ImageKit when no endpoint is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", "");
    expect(isTrustedPaymentScreenshotUrl("https://ik.imagekit.io/demo/a.png")).toBe(false);
  });
});
