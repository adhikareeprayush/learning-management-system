import { requireOrgAdminApi } from "@/lib/api";
import { getEmailMode, sendEmail } from "@/lib/email";
import { getEmailBranding, renderEmail } from "@/lib/email-layout";
import { formatEmailDateTime } from "@/lib/emails/render";

/** Sends a test message to the signed-in admin's own address and reports the outcome. */
export async function POST() {
  const auth = await requireOrgAdminApi();
  if (auth instanceof Response) return auth;

  const mode = getEmailMode();
  if (mode === "disabled") {
    return Response.json(
      {
        error: "Email delivery isn't configured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD and EMAIL_FROM.",
        code: "EMAIL_NOT_CONFIGURED",
        mode,
      },
      { status: 409 },
    );
  }

  const to = auth.session.user.email;
  const branding = await getEmailBranding();
  const { html, text } = renderEmail({
    branding,
    preheader: "Outgoing email is working.",
    heading: "Test email",
    paragraphs: [
      `If you're reading this, ${branding.orgName} can send email.`,
      "Password resets, payment updates, newsletters and contact-form messages all use this same connection.",
    ],
    details: [
      ["Sent to", to],
      ["Requested", formatEmailDateTime(new Date())],
    ],
  });

  const result = await sendEmail({
    to,
    subject: `Test email from ${branding.orgName}`,
    text,
    html,
    category: "test",
  });

  if (!result.ok) {
    return Response.json(
      { error: `Sending failed: ${result.error}`, code: result.code, mode: result.mode, to },
      { status: 502 },
    );
  }
  return Response.json({ ok: true, mode: result.mode, to });
}
