import { afterEach, describe, expect, it, vi } from "vitest";
import { assertServerEnv, checkServerEnv } from "@/env";

const base = {
  DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:5435/lms",
  BETTER_AUTH_SECRET: "k3Jx9vQ2mZr8Lw5Tn7Bp4Yc6Hd1Fg0Sa=",
  BETTER_AUTH_URL: "https://lms.example.com",
  NEXT_PUBLIC_APP_URL: "https://lms.example.com",
};

const production = {
  ...base,
  NODE_ENV: "production",
  IMAGEKIT_PUBLIC_KEY: "public_x",
  IMAGEKIT_PRIVATE_KEY: "private_x",
  IMAGEKIT_URL_ENDPOINT: "https://ik.imagekit.io/demo",
  SMTP_HOST: "smtp.example.com",
  EMAIL_FROM: "LMS <no-reply@example.com>",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkServerEnv", () => {
  it("passes a complete production config", () => {
    expect(checkServerEnv(production)).toEqual({ errors: [], warnings: [] });
  });

  it("requires the database, auth secret and public URL", () => {
    const { errors } = checkServerEnv({ NODE_ENV: "production" });
    expect(errors.join("\n")).toMatch(/DATABASE_URL/);
    expect(errors.join("\n")).toMatch(/BETTER_AUTH_SECRET/);
    expect(errors.join("\n")).toMatch(/BETTER_AUTH_URL/);
  });

  it("rejects malformed values", () => {
    const { errors } = checkServerEnv({ ...base, DATABASE_URL: "mysql://x", BETTER_AUTH_URL: "lms.example.com" });
    expect(errors).toHaveLength(2);
  });

  it("rejects placeholder secrets only in production", () => {
    const weak = { BETTER_AUTH_SECRET: "docker-dev-secret-change-me-32chars" };
    expect(checkServerEnv({ ...production, ...weak }).errors).toHaveLength(1);
    expect(checkServerEnv({ ...base, ...weak, NODE_ENV: "development" }).errors).toHaveLength(0);
  });

  it("accepts VERCEL_URL as a fallback with a warning", () => {
    const { errors, warnings } = checkServerEnv({
      ...production,
      BETTER_AUTH_URL: "",
      NEXT_PUBLIC_APP_URL: "",
      VERCEL_URL: "lms-git-main.vercel.app",
    });
    expect(errors).toEqual([]);
    expect(warnings.join("\n")).toMatch(/VERCEL_URL/);
  });

  it("warns about missing uploads and email in production", () => {
    const { errors, warnings } = checkServerEnv({
      ...base,
      NODE_ENV: "production",
      AUTH_REQUIRE_EMAIL_VERIFICATION: "true",
      NEXT_PUBLIC_DEMO_MODE: "true",
    });
    expect(errors).toEqual([]);
    const text = warnings.join("\n");
    expect(text).toMatch(/IMAGEKIT_PRIVATE_KEY/);
    expect(text).toMatch(/SMTP_HOST/);
    expect(text).toMatch(/AUTH_REQUIRE_EMAIL_VERIFICATION/);
    expect(text).toMatch(/NEXT_PUBLIC_DEMO_MODE/);
  });

  it("does not nag about integrations in development", () => {
    expect(checkServerEnv({ ...base, NODE_ENV: "development" }).warnings).toEqual([]);
  });
});

describe("assertServerEnv", () => {
  it("throws in production when required values are missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => assertServerEnv({ NODE_ENV: "production" })).toThrow(/DATABASE_URL/);
  });

  it("only warns in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => assertServerEnv({ NODE_ENV: "development" })).not.toThrow();
    expect(warn).toHaveBeenCalled();
  });

  it("skips the check during next build", () => {
    expect(() =>
      assertServerEnv({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" }),
    ).not.toThrow();
  });
});
