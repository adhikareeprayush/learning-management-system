import { appUrl } from "@/lib/app-url";
import type { EmailBranding } from "@/lib/email-layout";
import { renderRichEmail, type RenderedEmail } from "@/lib/emails/render";
import { oneClickUnsubscribeUrl, unsubscribePageUrl } from "@/lib/unsubscribe-token";

function preview(body: string) {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > 140 ? `${flat.slice(0, 137)}…` : flat;
}

/** RFC 2369 / RFC 8058 headers so mail clients show their own unsubscribe button. */
export function listUnsubscribeHeaders(
  subscriberId: string,
  supportEmail: string | null,
): Record<string, string> {
  const targets = [`<${oneClickUnsubscribeUrl(subscriberId)}>`];
  if (supportEmail) targets.push(`<mailto:${supportEmail}?subject=unsubscribe>`);
  return {
    "List-Unsubscribe": targets.join(", "),
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

export function newsletterEmail(
  branding: EmailBranding,
  campaign: { subject: string; body: string },
  recipient: { subscriberId: string } | { test: true },
): RenderedEmail {
  const test = "test" in recipient;
  const { html, text } = renderRichEmail({
    branding,
    preheader: preview(campaign.body),
    heading: campaign.subject,
    paragraphs: [],
    bodyText: campaign.body,
    footerNote: test
      ? "This is a test send. The unsubscribe link in a test email doesn't do anything."
      : `You're receiving this because you subscribed to updates from ${branding.orgName}.`,
    unsubscribeUrl: test ? appUrl("/unsubscribe") : unsubscribePageUrl(recipient.subscriberId),
  });
  return { subject: test ? `[Test] ${campaign.subject}` : campaign.subject, html, text };
}

export function newsletterWelcomeEmail(
  branding: EmailBranding,
  subscriberId: string,
): RenderedEmail {
  const { html, text } = renderRichEmail({
    branding,
    preheader: "You'll hear from us when there's something worth sharing.",
    heading: "You're subscribed",
    paragraphs: [
      `Thanks for signing up for updates from ${branding.orgName}. We'll email you about new courses and learning paths. No spam, and not too often.`,
      "Didn't sign up? Use the unsubscribe link below and you won't hear from us again.",
    ],
    cta: { label: "Browse courses", url: appUrl("/courses") },
    unsubscribeUrl: unsubscribePageUrl(subscriberId),
  });
  return { subject: `You're subscribed to ${branding.orgName} updates`, html, text };
}
