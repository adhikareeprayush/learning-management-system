import type { Organization } from "@prisma/client";
import { readOrganizationSettings } from "@/app/api/admin/organization/organization-settings";
import { prisma } from "@/lib/db";
import { canSendEmail, sendEmail } from "@/lib/email";
import { getEmailBranding, type EmailBranding } from "@/lib/email-layout";
import { contactTopicLabel } from "@/lib/emails/contact-topics";
import { formatEmailDateTime, renderRichEmail, type RenderedEmail } from "@/lib/emails/render";

type OrgSettingsSource = Pick<Organization, "name" | "settings" | "branding">;

function legacyContactEmail(settings: Organization["settings"]) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return "";
  const value = (settings as Record<string, unknown>).contactEmail;
  return typeof value === "string" ? value.trim() : "";
}

/** Inbox for contact-form mail: CONTACT_FORM_TO, else the institute's support address. */
export function contactRecipient(org: OrgSettingsSource | null | undefined) {
  const configured = process.env.CONTACT_FORM_TO?.trim();
  if (configured) return configured;
  if (!org) return null;
  return readOrganizationSettings(org).supportEmail.trim() || legacyContactEmail(org.settings) || null;
}

/**
 * In production the form only works when a message can actually reach someone;
 * in development messages are stored and printed to the console regardless.
 */
export function contactFormAvailable(org: OrgSettingsSource | null | undefined) {
  if (process.env.NODE_ENV !== "production") return true;
  return canSendEmail() && Boolean(contactRecipient(org));
}

export function contactMessageEmail(
  branding: EmailBranding,
  m: {
    name: string;
    email: string;
    topic: string;
    message: string;
    account: { id: string; name: string; email: string } | null;
    createdAt: Date;
  },
): RenderedEmail {
  const topic = contactTopicLabel(m.topic);
  const { html, text } = renderRichEmail({
    branding,
    preheader: m.message.replace(/\s+/g, " ").slice(0, 140),
    heading: `Message from ${m.name}`,
    paragraphs: [`${m.name} wrote in through the contact form about: ${topic}.`],
    quote: { label: "Message", text: m.message },
    details: [
      ["Name", m.name],
      ["Email", m.email],
      ["Topic", topic],
      [
        "Account",
        m.account
          ? `${m.account.name} (${m.account.email}) · ${m.account.id}`
          : "Not signed in",
      ],
      ["Received", formatEmailDateTime(m.createdAt)],
    ],
    footerNote: `Reply to this email to answer ${m.name} directly.`,
  });
  return { subject: `[Contact · ${topic}] ${m.name}`, html, text };
}

type DeliveryStatus = "SENT" | "LOGGED" | "FAILED";

/** Emails a stored ContactMessage to the support inbox and records the outcome. Never throws. */
export async function deliverContactMessage(messageId: string) {
  let status: DeliveryStatus = "FAILED";
  try {
    const message = await prisma.contactMessage.findUnique({
      where: { id: messageId },
      include: { organization: { select: { name: true, settings: true, branding: true } } },
    });
    if (!message || message.emailStatus !== "PENDING") return;

    const to = contactRecipient(message.organization);
    if (!to || !canSendEmail()) {
      console.info(
        `[contact] message ${message.id} stored without email (${to ? "email delivery not configured" : "no CONTACT_FORM_TO or support email set"})`,
      );
      status = "LOGGED";
    } else {
      const [account, branding] = await Promise.all([
        message.userId
          ? prisma.user.findUnique({
              where: { id: message.userId },
              select: { id: true, name: true, email: true },
            })
          : null,
        getEmailBranding(),
      ]);
      const rendered = contactMessageEmail(branding, { ...message, account });
      const result = await sendEmail({
        to,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
        replyTo: message.email,
        category: "contact",
      });
      if (result.ok) {
        status = result.mode === "smtp" ? "SENT" : "LOGGED";
      } else {
        console.error(`[contact] message ${message.id} could not be emailed: ${result.error}`);
      }
    }
  } catch (error) {
    console.error(`[contact] message ${messageId} delivery error`, error);
  }

  await prisma.contactMessage
    .updateMany({ where: { id: messageId, emailStatus: "PENDING" }, data: { emailStatus: status } })
    .catch((error) => console.error("[contact] could not record delivery status", error));
}
