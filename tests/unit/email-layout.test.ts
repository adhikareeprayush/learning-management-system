import { describe, expect, it, vi } from "vitest";

const { getDefaultOrganization } = vi.hoisted(() => ({ getDefaultOrganization: vi.fn() }));
vi.mock("@/lib/default-org", () => ({ getDefaultOrganization }));

import {
  PRODUCT_NAME,
  escapeHtml,
  getEmailBranding,
  plainTextToHtml,
  renderEmail,
  type EmailBranding,
} from "@/lib/email-layout";

const branding: EmailBranding = {
  productName: PRODUCT_NAME,
  orgName: "Kathmandu Coding School",
  supportEmail: "help@school.example",
  logoUrl: null,
  appUrl: "https://lms.example.com",
};

describe("escapeHtml", () => {
  it("escapes markup and quotes", () => {
    expect(escapeHtml(`<a href="x">'&`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
  });
});

describe("plainTextToHtml", () => {
  it("keeps paragraphs and line breaks and escapes text", () => {
    const html = plainTextToHtml("Hello <b>there</b>\nline two\n\nSecond paragraph");
    expect(html).toContain("Hello &lt;b&gt;there&lt;/b&gt;<br>line two");
    expect(html.match(/<p /g)).toHaveLength(2);
  });

  it("links bare URLs without breaking out of the attribute", () => {
    const html = plainTextToHtml(`See https://example.com/a?b=1 and https://x.test/"onmouseover=1`);
    expect(html).toContain('<a href="https://example.com/a?b=1"');
    expect(html).not.toContain('"onmouseover');
  });
});

describe("renderEmail", () => {
  const input = {
    branding,
    preheader: "Preview",
    heading: "Reset <your> password",
    paragraphs: ["Someone asked to reset your password."],
    cta: { label: "Choose a new password", url: "https://lms.example.com/reset?token=a&b=1" },
    details: [["Course", "Intro & basics"]] as [string, string][],
    footerNote: "Ignore this if it wasn't you.",
    unsubscribeUrl: "https://lms.example.com/unsubscribe?s=1&t=2",
  };

  it("renders an escaped HTML document", () => {
    const { html } = renderEmail(input);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("Reset &lt;your&gt; password");
    expect(html).toContain('href="https://lms.example.com/reset?token=a&amp;b=1"');
    expect(html).toContain("Intro &amp; basics");
    expect(html).toContain("Unsubscribe");
    expect(html).toContain("Kathmandu Coding School · help@school.example · Sent by Convolution LMS");
  });

  it("renders a matching plain-text part", () => {
    const { text } = renderEmail(input);
    expect(text).toContain("Reset <your> password");
    expect(text).toContain("Someone asked to reset your password.");
    expect(text).toContain("Course: Intro & basics");
    expect(text).toContain("Choose a new password: https://lms.example.com/reset?token=a&b=1");
    expect(text).toContain("Unsubscribe: https://lms.example.com/unsubscribe?s=1&t=2");
  });

  it("uses bodyHtml instead of paragraphs", () => {
    const { html, text } = renderEmail({ ...input, bodyHtml: "<p>custom</p>" });
    expect(html).toContain("<p>custom</p>");
    expect(html).not.toContain("Someone asked");
    expect(text).not.toContain("Someone asked");
  });

  it("only embeds https logos", () => {
    expect(renderEmail({ ...input, branding: { ...branding, logoUrl: "https://cdn.example/l.png" } }).html)
      .toContain('<img src="https://cdn.example/l.png"');
    expect(renderEmail({ ...input, branding: { ...branding, logoUrl: "http://cdn.example/l.png" } }).html)
      .not.toContain("<img");
  });

  it("omits the product credit when the institute uses the product name", () => {
    const { text } = renderEmail({ ...input, branding: { ...branding, orgName: PRODUCT_NAME } });
    expect(text).not.toContain("Sent by");
  });
});

describe("getEmailBranding", () => {
  it("reads the institute name, support email and logo", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://lms.example.com");
    getDefaultOrganization.mockResolvedValue({
      name: "Kathmandu Coding School",
      settings: { supportEmail: "help@school.example" },
      branding: { logoUrl: "/images/logo.png" },
    });

    await expect(getEmailBranding()).resolves.toEqual({
      productName: PRODUCT_NAME,
      orgName: "Kathmandu Coding School",
      supportEmail: "help@school.example",
      logoUrl: "https://lms.example.com/images/logo.png",
      appUrl: "https://lms.example.com",
    });
  });
});
