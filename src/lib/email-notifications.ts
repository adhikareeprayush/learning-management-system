import { prisma } from "@/lib/db";
import { getDefaultOrganization } from "@/lib/default-org";
import type { OutgoingEmail } from "@/lib/email";
import { sendEmailAfterResponse } from "@/lib/email-background";
import { getEmailBranding, type EmailBranding } from "@/lib/email-layout";
import {
  certificateIssuedEmail,
  courseArchivedEmail,
  coursePublishedEmail,
  courseReturnedEmail,
  courseSubmittedForReviewEmail,
  enrollmentGrantedEmail,
  enrollmentRevokedEmail,
  paymentApprovedEmail,
  paymentRefundedEmail,
  paymentRejectedEmail,
  paymentSubmittedEmail,
  submissionGradedEmail,
} from "@/lib/emails/notification-emails";
import type { RenderedEmail } from "@/lib/emails/render";
import { PAYMENT_METHOD_LABELS } from "@/lib/payment-methods";
import { formatCoursePrice, formatNprFromPaisa } from "@/lib/pricing";

/*
 * Event emails. Call these from route handlers / server code after the
 * triggering write succeeds; they schedule work with after() and never throw
 * or delay the response. Each takes ids and loads what it needs itself.
 */

type Recipient = {
  email: string;
  name: string;
  disabledAt: Date | null;
  deletedAt: Date | null;
};

const recipientSelect = { email: true, name: true, disabledAt: true, deletedAt: true } as const;

function reachable(user: Recipient | null | undefined): user is Recipient {
  return Boolean(user && !user.disabledAt && !user.deletedAt);
}

function toUser(
  user: Recipient,
  rendered: RenderedEmail,
  branding: EmailBranding,
): OutgoingEmail {
  return {
    to: user.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    replyTo: branding.supportEmail ?? undefined,
    category: "notification",
  };
}

/** Platform admins plus ORG_ADMIN members of the institute, minus suspended/deleted accounts. */
async function orgAdmins() {
  const org = await getDefaultOrganization();
  return prisma.user.findMany({
    where: {
      disabledAt: null,
      deletedAt: null,
      OR: [
        { role: "ADMIN" },
        ...(org
          ? [{ organizationMembers: { some: { organizationId: org.id, role: "ORG_ADMIN" as const } } }]
          : []),
      ],
    },
    select: recipientSelect,
  });
}

function toAdmins(
  admins: Recipient[],
  rendered: RenderedEmail,
  replyTo?: string,
): OutgoingEmail[] {
  return admins.map((admin) => ({
    to: admin.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html,
    replyTo,
    category: "notification",
  }));
}

/** To org admins: a student uploaded payment proof awaiting review. */
export function notifyPaymentSubmitted(paymentId: string) {
  sendEmailAfterResponse(async () => {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: recipientSelect },
        course: { select: { title: true } },
        paymentMethod: { select: { label: true } },
      },
    });
    if (!payment || payment.status !== "PENDING") return null;

    const [admins, branding] = await Promise.all([orgAdmins(), getEmailBranding()]);
    if (admins.length === 0) return null;

    const method =
      payment.paymentMethod?.label ??
      (payment.methodType ? PAYMENT_METHOD_LABELS[payment.methodType] : null);
    const rendered = paymentSubmittedEmail(branding, {
      studentName: payment.user.name,
      studentEmail: payment.user.email,
      courseTitle: payment.course.title,
      amount: formatNprFromPaisa(payment.amount),
      method,
      reference: payment.transactionId?.trim() || payment.referenceNote?.trim().slice(0, 200) || null,
      submittedAt: payment.createdAt,
    });
    return toAdmins(admins, rendered, payment.user.email);
  });
}

/** To the student: payment approved (with course link), rejected (with reason) or refunded. */
export function notifyPaymentReviewed(paymentId: string) {
  sendEmailAfterResponse(async () => {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: { select: { id: true, ...recipientSelect } },
        course: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!payment || !reachable(payment.user)) return null;

    const branding = await getEmailBranding();
    const base = {
      name: payment.user.name,
      courseTitle: payment.course.title,
      amount: formatNprFromPaisa(payment.amount),
    };

    let rendered: RenderedEmail;
    if (payment.status === "COMPLETED") {
      rendered = paymentApprovedEmail(branding, {
        ...base,
        courseSlug: payment.course.slug,
        orderId: payment.purchaseOrderId,
      });
    } else if (payment.status === "FAILED") {
      rendered = paymentRejectedEmail(branding, {
        ...base,
        courseSlug: payment.course.slug,
        reason: payment.rejectionReason?.trim() || null,
      });
    } else if (payment.status === "REFUNDED") {
      const enrollment = await prisma.enrollment.findUnique({
        where: { courseId_studentId: { courseId: payment.course.id, studentId: payment.user.id } },
        select: { id: true },
      });
      rendered = paymentRefundedEmail(branding, {
        ...base,
        orderId: payment.purchaseOrderId,
        accessRemoved: !enrollment,
      });
    } else {
      return null;
    }
    return toUser(payment.user, rendered, branding);
  });
}

/** To the student: an admin granted or removed course access manually. */
export function notifyEnrollmentChanged(input: {
  userId: string;
  courseId: string;
  change: "granted" | "revoked";
}) {
  sendEmailAfterResponse(async () => {
    const [user, course] = await Promise.all([
      prisma.user.findUnique({ where: { id: input.userId }, select: recipientSelect }),
      prisma.course.findUnique({
        where: { id: input.courseId },
        select: { title: true, slug: true },
      }),
    ]);
    if (!reachable(user) || !course) return null;

    const branding = await getEmailBranding();
    const rendered =
      input.change === "granted"
        ? enrollmentGrantedEmail(branding, {
            name: user.name,
            courseTitle: course.title,
            courseSlug: course.slug,
          })
        : enrollmentRevokedEmail(branding, { name: user.name, courseTitle: course.title });
    return toUser(user, rendered, branding);
  });
}

/** To the student: their assignment submission was graded. */
export function notifySubmissionGraded(submissionId: string) {
  sendEmailAfterResponse(async () => {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: recipientSelect },
        assignment: { select: { title: true, course: { select: { title: true } } } },
      },
    });
    if (!submission || submission.status !== "GRADED" || !reachable(submission.student)) {
      return null;
    }

    const branding = await getEmailBranding();
    const rendered = submissionGradedEmail(branding, {
      name: submission.student.name,
      assignmentTitle: submission.assignment.title,
      courseTitle: submission.assignment.course.title,
      grade: submission.grade,
      feedback: submission.feedback,
    });
    return toUser(submission.student, rendered, branding);
  });
}

/** To org admins: an instructor submitted a course for review. */
export function notifyCourseSubmittedForReview(courseId: string) {
  sendEmailAfterResponse(async () => {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        instructor: { select: recipientSelect },
        _count: { select: { lessons: true } },
      },
    });
    if (!course || course.status !== "IN_REVIEW") return null;

    const [admins, branding] = await Promise.all([orgAdmins(), getEmailBranding()]);
    const recipients = admins.filter((admin) => admin.email !== course.instructor.email);
    if (recipients.length === 0) return null;

    const rendered = courseSubmittedForReviewEmail(branding, {
      courseId: course.id,
      courseTitle: course.title,
      instructorName: course.instructor.name,
      instructorEmail: course.instructor.email,
      price: formatCoursePrice(course),
      lessonCount: course._count.lessons,
    });
    return toAdmins(recipients, rendered, course.instructor.email);
  });
}

/** To the instructor: an admin published, returned (with Course.reviewNote) or archived their course. */
export function notifyCourseReviewed(courseId: string) {
  sendEmailAfterResponse(async () => {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { instructor: { select: recipientSelect } },
    });
    if (!course || !reachable(course.instructor)) return null;

    const branding = await getEmailBranding();
    const base = {
      name: course.instructor.name,
      courseTitle: course.title,
      courseSlug: course.slug,
    };
    const note = course.reviewNote?.trim() || null;

    let rendered: RenderedEmail;
    if (course.status === "PUBLISHED") {
      // reviewNote may still hold an older "please fix" note; don't repeat it on approval.
      rendered = coursePublishedEmail(branding, base);
    } else if (course.status === "DRAFT") {
      rendered = courseReturnedEmail(branding, { ...base, note });
    } else if (course.status === "ARCHIVED") {
      rendered = courseArchivedEmail(branding, { ...base, note });
    } else {
      return null;
    }
    return toUser(course.instructor, rendered, branding);
  });
}

/** To the student: a course or roadmap certificate was issued. */
export function notifyCertificateIssued(input: {
  kind: "course" | "roadmap";
  certificateId: string;
}) {
  sendEmailAfterResponse(async () => {
    const certificate =
      input.kind === "course"
        ? await prisma.certificate
            .findUnique({
              where: { id: input.certificateId },
              include: {
                student: { select: recipientSelect },
                course: { select: { title: true } },
              },
            })
            .then((cert) =>
              cert
                ? {
                    student: cert.student,
                    holderName: cert.holderName,
                    title: cert.courseTitle || cert.course.title,
                    credentialId: cert.credentialId,
                    issuedAt: cert.issuedAt,
                    courseCount: null,
                  }
                : null,
            )
        : await prisma.roadmapCertificate
            .findUnique({
              where: { id: input.certificateId },
              include: {
                student: { select: recipientSelect },
                roadmap: { select: { title: true } },
              },
            })
            .then((cert) =>
              cert
                ? {
                    student: cert.student,
                    holderName: cert.holderName,
                    title: cert.roadmapTitle || cert.roadmap.title,
                    credentialId: cert.credentialId,
                    issuedAt: cert.issuedAt,
                    courseCount: cert.courseCount,
                  }
                : null,
            );
    if (!certificate || !reachable(certificate.student)) return null;

    const branding = await getEmailBranding();
    const rendered = certificateIssuedEmail(branding, {
      name: certificate.holderName || certificate.student.name,
      kind: input.kind,
      title: certificate.title,
      credentialId: certificate.credentialId,
      issuedAt: certificate.issuedAt,
      courseCount: certificate.courseCount,
    });
    return toUser(certificate.student, rendered, branding);
  });
}
