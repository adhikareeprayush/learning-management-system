import { afterEach, describe, expect, it, vi } from "vitest";
import { canSendEmail, getEmailMode, sendEmail } from "@/lib/email";

function setEnv(env: { NODE_ENV?: string; SMTP_HOST?: string; EMAIL_TRANSPORT?: string }) {
  vi.stubEnv("NODE_ENV", env.NODE_ENV ?? "development");
  vi.stubEnv("SMTP_HOST", env.SMTP_HOST ?? "");
  vi.stubEnv("EMAIL_TRANSPORT", env.EMAIL_TRANSPORT ?? "");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getEmailMode", () => {
  it("uses SMTP whenever SMTP_HOST is set", () => {
    setEnv({ SMTP_HOST: "smtp.example.com" });
    expect(getEmailMode()).toBe("smtp");
    setEnv({ NODE_ENV: "production", SMTP_HOST: "smtp.example.com" });
    expect(getEmailMode()).toBe("smtp");
  });

  it("prints to the console in development without SMTP", () => {
    setEnv({});
    expect(getEmailMode()).toBe("console");
    expect(canSendEmail()).toBe(true);
  });

  it("is disabled in production without SMTP", () => {
    setEnv({ NODE_ENV: "production" });
    expect(getEmailMode()).toBe("disabled");
    expect(canSendEmail()).toBe(false);
  });

  it("honours EMAIL_TRANSPORT=console even with SMTP set", () => {
    setEnv({ SMTP_HOST: "smtp.example.com", EMAIL_TRANSPORT: "console" });
    expect(getEmailMode()).toBe("console");
  });
});

describe("sendEmail without SMTP", () => {
  const message = {
    to: "student@example.com",
    subject: "Hello",
    text: "Open https://lms.example.com/x",
    category: "test" as const,
  };

  it("logs the message in console mode", async () => {
    setEnv({});
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await expect(sendEmail(message)).resolves.toEqual({ ok: true, mode: "console" });
    expect(info.mock.calls[0]?.[0]).toContain("https://lms.example.com/x");
  });

  it("drops the message without logging its body when disabled", async () => {
    setEnv({ NODE_ENV: "production" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const result = await sendEmail(message);
    expect(result.ok).toBe(false);
    expect(warn.mock.calls.flat().join(" ")).not.toContain("https://lms.example.com/x");
  });

  it("never sends to anonymized .invalid addresses", async () => {
    setEnv({});
    const result = await sendEmail({ ...message, to: "deleted-1@deleted.invalid" });
    expect(result).toMatchObject({ ok: false, error: "suppressed" });
  });
});
