import { appUrl } from "@/lib/app-url";
import { prisma } from "@/lib/db";
import { sendEmailOrThrow } from "@/lib/email";
import { sendEmailAfterResponse } from "@/lib/email-background";
import { getEmailBranding, renderEmail } from "@/lib/email-layout";

export const RESET_PASSWORD_TOKEN_TTL_SECONDS = 60 * 60;
export const EMAIL_VERIFICATION_TTL_SECONDS = 60 * 60 * 24;

type AuthEmailUser = { id: string; email: string; name?: string | null };

/** Suspended or deleted accounts get no auth emails. */
async function cannotReceive(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { disabledAt: true, deletedAt: true },
  });
  return !user || Boolean(user.disabledAt || user.deletedAt);
}

function greeting(user: AuthEmailUser) {
  const first = user.name?.trim().split(/\s+/)[0];
  return first ? `Hi ${first},` : "Hi,";
}

/** Throws when delivery fails, so better-auth logs it. */
export async function sendResetPasswordEmail(user: AuthEmailUser, url: string) {
  if (await cannotReceive(user.id)) return;

  const branding = await getEmailBranding();
  const minutes = RESET_PASSWORD_TOKEN_TTL_SECONDS / 60;
  const { html, text } = renderEmail({
    branding,
    preheader: `Choose a new password within ${minutes} minutes.`,
    heading: "Reset your password",
    paragraphs: [
      greeting(user),
      `We received a request to reset the password for your ${branding.orgName} account (${user.email}).`,
      `Use the button below to choose a new password. The link expires in ${minutes} minutes and works once.`,
    ],
    cta: { label: "Choose a new password", url },
    footerNote:
      "If you didn't ask to reset your password, ignore this email. Your password won't change.",
  });

  await sendEmailOrThrow({
    to: user.email,
    subject: `Reset your ${branding.orgName} password`,
    html,
    text,
    category: "auth",
  });
}

/** Throws when delivery fails, so the dashboard "Resend" button can show the error. */
export async function sendVerifyEmail(user: AuthEmailUser, url: string) {
  if (await cannotReceive(user.id)) return;

  const branding = await getEmailBranding();
  const hours = EMAIL_VERIFICATION_TTL_SECONDS / 3600;
  const { html, text } = renderEmail({
    branding,
    preheader: "Confirm your email address to finish setting up your account.",
    heading: "Confirm your email address",
    paragraphs: [
      greeting(user),
      `Welcome to ${branding.orgName}. Please confirm that ${user.email} is your email address so we can reach you about your courses, payments and certificates.`,
      `The link expires in ${hours} hours.`,
    ],
    cta: { label: "Verify email", url },
    footerNote:
      "If you didn't create an account, you can ignore this email.",
  });

  await sendEmailOrThrow({
    to: user.email,
    subject: `Confirm your email for ${branding.orgName}`,
    html,
    text,
    category: "auth",
  });
}

/** Security notice after a password reset; sent after the response. */
export function sendPasswordChangedNotice(user: AuthEmailUser) {
  sendEmailAfterResponse(async () => {
    if (await cannotReceive(user.id)) return null;

    const branding = await getEmailBranding();
    const contact = branding.supportEmail
      ? `contact ${branding.supportEmail}`
      : "contact your institute";
    const { html, text } = renderEmail({
      branding,
      preheader: "Your password was just changed.",
      heading: "Your password was changed",
      paragraphs: [
        greeting(user),
        `The password for your ${branding.orgName} account (${user.email}) was just reset, and you've been signed out on all devices.`,
        `If this wasn't you, reset your password again right away and ${contact}.`,
      ],
      cta: { label: "Sign in", url: appUrl("/login") },
    });

    return {
      to: user.email,
      subject: `Your ${branding.orgName} password was changed`,
      html,
      text,
      category: "auth",
    };
  });
}
