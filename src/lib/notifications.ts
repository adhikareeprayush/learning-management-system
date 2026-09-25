import { prisma } from "@/lib/db";
import type { DashboardRole } from "@/lib/nav";
import { formatNprFromPaisa } from "@/lib/pricing";

/** Derived from existing records — there is no notifications table. */
export type DashboardNotification = {
  id: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

const WINDOW_DAYS = 30;
const PER_SOURCE = 10;
const MAX_ITEMS = 20;

type Draft = Omit<DashboardNotification, "createdAt"> & { at: Date };

function formatGrade(grade: number | null) {
  if (grade == null) return "";
  return ` · ${Math.round(grade * 10) / 10}/100`;
}

async function studentNotifications(
  userId: string,
  organizationId: string,
  since: Date,
): Promise<Draft[]> {
  const [payments, graded, assignments, certificates, roadmapCertificates] =
    await Promise.all([
      prisma.payment.findMany({
        where: {
          userId,
          course: { organizationId },
          status: { in: ["COMPLETED", "FAILED"] },
          updatedAt: { gte: since },
        },
        orderBy: { updatedAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          status: true,
          rejectionReason: true,
          reviewedAt: true,
          updatedAt: true,
          course: { select: { title: true, slug: true } },
        },
      }),
      prisma.submission.findMany({
        where: {
          studentId: userId,
          status: "GRADED",
          gradedAt: { gte: since },
          assignment: { course: { organizationId } },
        },
        orderBy: { gradedAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          grade: true,
          gradedAt: true,
          assignment: {
            select: { title: true, course: { select: { title: true } } },
          },
        },
      }),
      prisma.assignment.findMany({
        where: {
          createdAt: { gte: since },
          course: {
            organizationId,
            enrollments: { some: { studentId: userId } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          title: true,
          createdAt: true,
          course: { select: { title: true } },
        },
      }),
      prisma.certificate.findMany({
        where: {
          studentId: userId,
          issuedAt: { gte: since },
          course: { organizationId },
        },
        orderBy: { issuedAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          issuedAt: true,
          course: { select: { title: true } },
        },
      }),
      prisma.roadmapCertificate.findMany({
        where: {
          studentId: userId,
          issuedAt: { gte: since },
          roadmap: { organizationId },
        },
        orderBy: { issuedAt: "desc" },
        take: PER_SOURCE,
        select: {
          id: true,
          issuedAt: true,
          roadmap: { select: { title: true } },
        },
      }),
    ]);

  return [
    ...payments.map((payment): Draft => {
      const at = payment.reviewedAt ?? payment.updatedAt;
      if (payment.status === "COMPLETED") {
        return {
          id: `payment-${payment.id}-approved`,
          title: "Payment approved",
          body: `You're enrolled in ${payment.course.title}.`,
          href: `/student/courses/${payment.course.slug}`,
          at,
        };
      }
      return {
        id: `payment-${payment.id}-rejected`,
        title: "Payment rejected",
        body: payment.rejectionReason
          ? `${payment.course.title}: ${payment.rejectionReason}`
          : `Your payment for ${payment.course.title} could not be verified.`,
        href: `/courses/${payment.course.slug}`,
        at,
      };
    }),
    ...graded.map(
      (submission): Draft => ({
        id: `graded-${submission.id}`,
        title: "Assignment graded",
        body: `${submission.assignment.title} · ${submission.assignment.course.title}${formatGrade(submission.grade)}`,
        href: "/student/assignments",
        at: submission.gradedAt ?? since,
      }),
    ),
    ...assignments.map(
      (assignment): Draft => ({
        id: `assignment-${assignment.id}`,
        title: "New assignment",
        body: `${assignment.title} in ${assignment.course.title}`,
        href: "/student/assignments",
        at: assignment.createdAt,
      }),
    ),
    ...certificates.map(
      (certificate): Draft => ({
        id: `certificate-${certificate.id}`,
        title: "Certificate issued",
        body: certificate.course.title,
        href: "/student/certificates",
        at: certificate.issuedAt,
      }),
    ),
    ...roadmapCertificates.map(
      (certificate): Draft => ({
        id: `roadmap-certificate-${certificate.id}`,
        title: "Path certificate issued",
        body: certificate.roadmap.title,
        href: "/student/certificates",
        at: certificate.issuedAt,
      }),
    ),
  ];
}

async function instructorNotifications(
  userId: string,
  organizationId: string,
  since: Date,
): Promise<Draft[]> {
  const ownCourse = { instructorId: userId, organizationId };
  const [submissions, enrollments, reviews] = await Promise.all([
    prisma.submission.findMany({
      where: {
        status: { not: "GRADED" },
        submittedAt: { gte: since },
        assignment: { course: ownCourse },
      },
      orderBy: { submittedAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        submittedAt: true,
        student: { select: { name: true } },
        assignment: {
          select: {
            title: true,
            course: { select: { slug: true } },
          },
        },
      },
    }),
    prisma.enrollment.findMany({
      where: { enrolledAt: { gte: since }, course: ownCourse },
      orderBy: { enrolledAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        enrolledAt: true,
        student: { select: { name: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: since }, course: ownCourse },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        rating: true,
        createdAt: true,
        student: { select: { name: true } },
        course: { select: { title: true, slug: true } },
      },
    }),
  ]);

  return [
    ...submissions.map(
      (submission): Draft => ({
        id: `submission-${submission.id}-${submission.submittedAt.getTime()}`,
        title: "New submission to grade",
        body: `${submission.student.name} submitted ${submission.assignment.title}.`,
        href: `/instructor/courses/${submission.assignment.course.slug}/assignments`,
        at: submission.submittedAt,
      }),
    ),
    ...enrollments.map(
      (enrollment): Draft => ({
        id: `enrollment-${enrollment.id}`,
        title: "New enrollment",
        body: `${enrollment.student.name} joined ${enrollment.course.title}.`,
        href: `/instructor/courses/${enrollment.course.slug}/students`,
        at: enrollment.enrolledAt,
      }),
    ),
    ...reviews.map(
      (review): Draft => ({
        id: `review-${review.id}`,
        title: "New review",
        body: `${review.student.name} rated ${review.course.title} ${review.rating}/5.`,
        href: `/instructor/courses/${review.course.slug}/reviews`,
        at: review.createdAt,
      }),
    ),
  ];
}

/** Admin items are open work queues, so they are not limited to the recent window. */
async function adminNotifications(organizationId: string): Promise<Draft[]> {
  const [payments, courses] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "PENDING", course: { organizationId } },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        amount: true,
        createdAt: true,
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    }),
    prisma.course.findMany({
      where: { organizationId, status: "IN_REVIEW" },
      orderBy: { updatedAt: "desc" },
      take: PER_SOURCE,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        instructor: { select: { name: true } },
      },
    }),
  ]);

  return [
    ...payments.map(
      (payment): Draft => ({
        id: `pending-payment-${payment.id}`,
        title: "Payment awaiting review",
        body: `${payment.user.name} · ${payment.course.title} · ${formatNprFromPaisa(payment.amount)}`,
        href: "/admin/payments",
        at: payment.createdAt,
      }),
    ),
    ...courses.map(
      (course): Draft => ({
        id: `course-review-${course.id}-${course.updatedAt.getTime()}`,
        title: "Course awaiting review",
        body: `${course.title} by ${course.instructor.name}`,
        href: `/admin/courses?q=${encodeURIComponent(course.title)}`,
        at: course.updatedAt,
      }),
    ),
  ];
}

export async function getDashboardNotifications(input: {
  userId: string;
  organizationId: string;
  scope: DashboardRole;
}): Promise<DashboardNotification[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const drafts =
    input.scope === "admin"
      ? await adminNotifications(input.organizationId)
      : input.scope === "instructor"
        ? await instructorNotifications(input.userId, input.organizationId, since)
        : await studentNotifications(input.userId, input.organizationId, since);

  return drafts
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, MAX_ITEMS)
    .map(({ at, ...item }) => ({ ...item, createdAt: at.toISOString() }));
}
