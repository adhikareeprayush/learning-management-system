import { readOrganizationSettings } from "@/app/api/admin/organization/organization-settings";
import { appUrl } from "@/lib/app-url";
import { getDefaultOrganization } from "@/lib/default-org";

export const PRODUCT_NAME = "Convolution LMS";

export type EmailBranding = {
  productName: string;
  orgName: string;
  supportEmail: string | null;
  logoUrl: string | null;
  appUrl: string;
};

let cachedBranding: { value: EmailBranding; at: number } | null = null;
const BRANDING_TTL_MS = 60_000;

/** Institute name, support address and logo for emails. Never throws. */
export async function getEmailBranding(): Promise<EmailBranding> {
  if (cachedBranding && Date.now() - cachedBranding.at < BRANDING_TTL_MS) {
    return cachedBranding.value;
  }

  let value: EmailBranding = {
    productName: PRODUCT_NAME,
    orgName: PRODUCT_NAME,
    supportEmail: null,
    logoUrl: null,
    appUrl: appUrl(),
  };

  try {
    const org = await getDefaultOrganization();
    if (org) {
      const settings = readOrganizationSettings(org);
      const logo = settings.logoUrl.trim();
      value = {
        ...value,
        orgName: settings.name || PRODUCT_NAME,
        supportEmail: settings.supportEmail.trim() || null,
        logoUrl: logo ? (logo.startsWith("/") ? appUrl(logo) : logo) : null,
      };
    }
  } catch (error) {
    console.error("[email] could not load branding", error);
  }

  cachedBranding = { value, at: Date.now() };
  return value;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes, keeps paragraphs and line breaks, and links bare URLs. */
export function plainTextToHtml(value: string) {
  return value
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const html = escapeHtml(paragraph)
        .replace(
          /https?:\/\/[^\s<>"]+/g,
          (url) => `<a href="${url}" style="color:#04016C;">${url}</a>`,
        )
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;">${html}</p>`;
    })
    .join("");
}

export type RenderEmailInput = {
  branding: EmailBranding;
  /** Inbox preview text. */
  preheader?: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  details?: [label: string, value: string][];
  footerNote?: string;
  unsubscribeUrl?: string;
  /** Pre-rendered body HTML (e.g. from plainTextToHtml) used instead of paragraphs. */
  bodyHtml?: string;
};

const NAVY = "#04016C";
const TEAL = "#2AAA94";
const INK = "#324361";
const MUTED = "#5c6b82";

export function renderEmail(input: RenderEmailInput): { html: string; text: string } {
  const { branding } = input;
  const logo =
    branding.logoUrl?.startsWith("https://")
      ? `<img src="${escapeHtml(branding.logoUrl)}" alt="${escapeHtml(branding.orgName)}" height="32" style="display:block;height:32px;border:0;">`
      : `<span style="font-size:20px;font-weight:700;color:#ffffff;">Convolution <span style="color:#4BE5CA;">LMS</span></span>`;

  const body =
    input.bodyHtml ??
    input.paragraphs
      .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`)
      .join("");

  const details = input.details?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 20px;border:1px solid #e6e9f2;border-radius:8px;">${input.details
        .map(
          ([label, value]) =>
            `<tr><td style="padding:10px 14px;color:${MUTED};font-size:13px;width:40%;">${escapeHtml(label)}</td><td style="padding:10px 14px;color:${INK};font-size:14px;font-weight:600;">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  const cta = input.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;"><tr><td style="background:${NAVY};border-radius:8px;"><a href="${escapeHtml(input.cta.url)}" style="display:inline-block;padding:12px 22px;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">${escapeHtml(input.cta.label)}</a></td></tr></table>
<p style="margin:0 0 16px;font-size:12px;color:${MUTED};">If the button doesn't work, copy this link:<br><a href="${escapeHtml(input.cta.url)}" style="color:${NAVY};word-break:break-all;">${escapeHtml(input.cta.url)}</a></p>`
    : "";

  const footerParts = [
    branding.orgName,
    branding.supportEmail,
    branding.orgName === branding.productName ? null : `Sent by ${branding.productName}`,
  ].filter(Boolean) as string[];

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="color-scheme" content="light"><title>${escapeHtml(input.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f6fb;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader ?? "")}</span>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6fb;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="height:4px;background:${TEAL};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="background:${NAVY};padding:18px 28px;">${logo}</td></tr>
<tr><td style="padding:28px;color:${INK};font-size:15px;line-height:1.6;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${NAVY};">${escapeHtml(input.heading)}</h1>
${body}${details}${cta}${input.footerNote ? `<p style="margin:0;font-size:13px;color:${MUTED};">${escapeHtml(input.footerNote)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e6e9f2;font-size:12px;color:${MUTED};">${footerParts.map(escapeHtml).join(" · ")}${
    input.unsubscribeUrl
      ? `<br><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${MUTED};">Unsubscribe</a>`
      : ""
  }</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [
    input.heading,
    "",
    ...(input.bodyHtml ? [] : input.paragraphs.flatMap((p) => [p, ""])),
    ...(input.details ?? []).map(([label, value]) => `${label}: ${value}`),
    ...(input.details?.length ? [""] : []),
    ...(input.cta ? [`${input.cta.label}: ${input.cta.url}`, ""] : []),
    ...(input.footerNote ? [input.footerNote, ""] : []),
    "—",
    footerParts.join(" · "),
    ...(input.unsubscribeUrl ? [`Unsubscribe: ${input.unsubscribeUrl}`] : []),
  ].join("\n");

  return { html, text };
}
