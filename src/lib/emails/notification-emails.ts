import type { EmailBranding } from "@/lib/email-layout";
import { appUrl } from "@/lib/app-url";
import {
  firstName,
  formatEmailDate,
  renderRichEmail,
  type RenderedEmail,
} from "@/lib/emails/render";

/*
 * Event email templates. Pure functions: callers load the data and pass it in
 * (see src/lib/email-notifications.ts). Keep them short and link to the app.
 */

function helpLine(branding: EmailBranding) {
  return branding.supportEmail
    ? `Questions? Reply to this email or write to ${branding.supportEmail}.`
    : `Questions? Contact us at ${appUrl("/contact")}.`;
}

function build(
  subject: string,
  input: Parameters<typeof renderRichEmail>[0],
): RenderedEmail {
  // Skip the greeting so the inbox preview says something useful.
  const preheader = input.paragraphs.find((p) => !/^(Hi|Congratulations)\b/.test(p));
  return { subject, ...renderRichEmail({ preheader, ...input }) };
}

/* Payments */

export function paymentSubmittedEmail(
  branding: EmailBranding,
  p: {
    studentName: string;
    studentEmail: string;
    courseTitle: string;
    amount: string;
    method: string | null;
    reference: string | null;
    submittedAt: Date;
  },
) {
  return build(`Payment to review: ${p.courseTitle}`, {
    branding,
    heading: "New payment to review",
    paragraphs: [
      `${p.studentName} submitted payment proof for ${p.courseTitle}.`,
      "Check the screenshot and reference against your account, then approve or reject it. The student is enrolled once you approve.",
    ],
    details: [
      ["Student", `${p.studentName} (${p.studentEmail})`],
      ["Course", p.courseTitle],
      ["Amount", p.amount],
      ...(p.method ? ([["Method", p.method]] as [string, string][]) : []),
      ...(p.reference ? ([["Reference", p.reference]] as [string, string][]) : []),
      ["Submitted", formatEmailDate(p.submittedAt)],
    ],
    cta: { label: "Review payment", url: appUrl("/admin/payments") },
    footerNote: "You're receiving this because you're an administrator of this institute.",
  });
}

export function paymentApprovedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string; courseSlug: string; amount: string; orderId: string },
) {
  return build(`You're enrolled in ${p.courseTitle}`, {
    branding,
    heading: "Payment approved",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `We've verified your payment of ${p.amount} for ${p.courseTitle}. The course is unlocked and waiting in your dashboard.`,
    ],
    details: [
      ["Course", p.courseTitle],
      ["Amount", p.amount],
      ["Order ID", p.orderId],
    ],
    cta: { label: "Start learning", url: appUrl(`/student/courses/${encodeURIComponent(p.courseSlug)}`) },
    footerNote: helpLine(branding),
  });
}

export function paymentRejectedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string; courseSlug: string; amount: string; reason: string | null },
) {
  return build(`We couldn't verify your payment for ${p.courseTitle}`, {
    branding,
    heading: "Payment not verified",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `We couldn't verify the ${p.amount} payment you submitted for ${p.courseTitle}, so the course hasn't been unlocked.`,
      "You can submit new payment proof from the course page.",
    ],
    quote: p.reason ? { label: "Reason", text: p.reason } : null,
    cta: {
      label: "Submit payment again",
      url: appUrl(`/courses/${encodeURIComponent(p.courseSlug)}?pay=1`),
    },
    footerNote: helpLine(branding),
  });
}

export function paymentRefundedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string; amount: string; orderId: string; accessRemoved: boolean },
) {
  return build(`Refund processed for ${p.courseTitle}`, {
    branding,
    heading: "Payment refunded",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `Your payment of ${p.amount} for ${p.courseTitle} has been refunded.`,
      ...(p.accessRemoved ? ["Your access to the course has been removed."] : []),
    ],
    details: [
      ["Course", p.courseTitle],
      ["Amount", p.amount],
      ["Order ID", p.orderId],
    ],
    footerNote: helpLine(branding),
  });
}

/* Enrollment */

export function enrollmentGrantedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string; courseSlug: string },
) {
  return build(`You now have access to ${p.courseTitle}`, {
    branding,
    heading: "Course access granted",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `You've been given access to ${p.courseTitle}. It's ready in your dashboard whenever you are.`,
    ],
    cta: { label: "Open course", url: appUrl(`/student/courses/${encodeURIComponent(p.courseSlug)}`) },
    footerNote: helpLine(branding),
  });
}

export function enrollmentRevokedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string },
) {
  return build(`Your access to ${p.courseTitle} was removed`, {
    branding,
    heading: "Course access removed",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `An administrator removed your access to ${p.courseTitle}.`,
      "If you think this is a mistake, get in touch and we'll sort it out.",
    ],
    cta: { label: "My courses", url: appUrl("/student/courses") },
    footerNote: helpLine(branding),
  });
}

/* Assignments */

export function submissionGradedEmail(
  branding: EmailBranding,
  p: {
    name: string;
    assignmentTitle: string;
    courseTitle: string;
    grade: number | null;
    feedback: string | null;
  },
) {
  const grade = p.grade === null ? null : `${Number(p.grade.toFixed(1))} / 100`;
  const feedback = p.feedback?.trim() ?? "";
  return build(`Graded: ${p.assignmentTitle}`, {
    branding,
    heading: "Your assignment was graded",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `Your submission for "${p.assignmentTitle}" in ${p.courseTitle} has been graded${grade ? `: ${grade}` : ""}.`,
    ],
    details: [
      ["Assignment", p.assignmentTitle],
      ["Course", p.courseTitle],
      ...(grade ? ([["Grade", grade]] as [string, string][]) : []),
    ],
    quote: feedback
      ? {
          label: "Feedback from your instructor",
          text: feedback.length > 1200 ? `${feedback.slice(0, 1200).trimEnd()}…` : feedback,
        }
      : null,
    cta: { label: "View assignments", url: appUrl("/student/assignments") },
    footerNote: helpLine(branding),
  });
}

/* Course moderation */

export function courseSubmittedForReviewEmail(
  branding: EmailBranding,
  p: {
    courseId: string;
    courseTitle: string;
    instructorName: string;
    instructorEmail: string;
    price: string;
    lessonCount: number;
  },
) {
  return build(`Course to review: ${p.courseTitle}`, {
    branding,
    heading: "A course is waiting for review",
    paragraphs: [
      `${p.instructorName} submitted "${p.courseTitle}" for review.`,
      "Check the content and publish it, or return it to draft with a note for the instructor.",
    ],
    details: [
      ["Course", p.courseTitle],
      ["Instructor", `${p.instructorName} (${p.instructorEmail})`],
      ["Price", p.price],
      ["Lessons", String(p.lessonCount)],
    ],
    cta: { label: "Review course", url: appUrl(`/admin/courses/${encodeURIComponent(p.courseId)}`) },
    footerNote: "You're receiving this because you're an administrator of this institute.",
  });
}

export function coursePublishedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string; courseSlug: string },
) {
  return build(`"${p.courseTitle}" is live`, {
    branding,
    heading: "Your course was published",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `Good news: "${p.courseTitle}" was approved and is now listed in the course catalog.`,
    ],
    bodyText: `Manage it from your instructor dashboard: ${appUrl(`/instructor/courses/${encodeURIComponent(p.courseSlug)}`)}`,
    cta: { label: "View course page", url: appUrl(`/courses/${encodeURIComponent(p.courseSlug)}`) },
    footerNote: helpLine(branding),
  });
}

export function courseReturnedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string; courseSlug: string; note: string | null },
) {
  return build(`Changes requested: ${p.courseTitle}`, {
    branding,
    heading: "Your course needs changes",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `An administrator reviewed "${p.courseTitle}" and moved it back to draft.`,
      "Make the changes, then submit it for review again.",
    ],
    quote: p.note ? { label: "Reviewer's note", text: p.note } : null,
    cta: { label: "Edit course", url: appUrl(`/instructor/courses/${encodeURIComponent(p.courseSlug)}`) },
    footerNote: helpLine(branding),
  });
}

export function courseArchivedEmail(
  branding: EmailBranding,
  p: { name: string; courseTitle: string; courseSlug: string; note: string | null },
) {
  return build(`"${p.courseTitle}" was archived`, {
    branding,
    heading: "Your course was archived",
    paragraphs: [
      `Hi ${firstName(p.name)},`,
      `An administrator archived "${p.courseTitle}". It's no longer listed in the course catalog.`,
    ],
    quote: p.note ? { label: "Reviewer's note", text: p.note } : null,
    cta: { label: "Open course", url: appUrl(`/instructor/courses/${encodeURIComponent(p.courseSlug)}`) },
    footerNote: helpLine(branding),
  });
}

/* Certificates */

export function certificateIssuedEmail(
  branding: EmailBranding,
  p: {
    name: string;
    kind: "course" | "roadmap";
    title: string;
    credentialId: string;
    issuedAt: Date;
    courseCount?: number | null;
  },
) {
  const what =
    p.kind === "roadmap"
      ? `You've completed every course in the ${p.title} learning path.`
      : `You've completed ${p.title}.`;
  return build(`Your certificate: ${p.title}`, {
    branding,
    heading: "Your certificate is ready",
    paragraphs: [
      `Congratulations, ${firstName(p.name)}!`,
      `${what} Your certificate has been issued, and anyone can check it with the verification link below.`,
    ],
    details: [
      [p.kind === "roadmap" ? "Learning path" : "Course", p.title],
      ...(p.kind === "roadmap" && p.courseCount
        ? ([["Courses completed", String(p.courseCount)]] as [string, string][])
        : []),
      ["Issued", formatEmailDate(p.issuedAt)],
      ["Credential ID", p.credentialId],
    ],
    cta: {
      label: "View certificate",
      url: appUrl(`/verify/${encodeURIComponent(p.credentialId)}`),
    },
    footerNote: `Download the PDF any time from Certificates in your dashboard. ${helpLine(branding)}`,
  });
}
