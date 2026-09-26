import Image from "next/image";
import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Circle,
  Map as MapIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { EnrollButton } from "@/components/course/enroll-button";
import { RoadmapEnrollButton } from "@/components/course/roadmap-enroll-button";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDuration, formatLevel, pluralize } from "@/lib/format";
import { getRoadmapDetail } from "@/lib/roadmaps";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { courseRequiresPayment, formatCoursePrice } from "@/lib/pricing";
import { resolveMediaUrl } from "@/lib/imagekit-url";
import { shareImageMetadata } from "@/lib/institute";

/** Published roadmap (with the viewer's progress); shared by the page and its metadata. */
const loadRoadmap = cache(async (roadmapId: string) => {
  const [tenant, session] = await Promise.all([
    resolveTenantFromHeaders(),
    getServerSession(),
  ]);
  if (!tenant) return null;
  return getRoadmapDetail(
    tenant.organizationId,
    roadmapId,
    session?.user.id ?? null,
  );
});

type Props = { params: Promise<{ roadmapId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roadmapId } = await params;
  const roadmap = await loadRoadmap(roadmapId);
  if (!roadmap) return { title: "Roadmap not found" };
  return {
    title: roadmap.title,
    description:
      roadmap.description?.slice(0, 160) ||
      `A ${roadmap.courseCount}-course learning path with a certificate when you finish.`,
    alternates: { canonical: `/roadmaps/${roadmap.slug}` },
    // The loader substitutes a stock image for a missing cover; keep the brand card then.
    ...(await shareImageMetadata(
      roadmap.thumbnail !== resolveMediaUrl(null) ? roadmap.thumbnail : null,
      roadmap.title,
    )),
  };
}

export default async function RoadmapDetailPage({ params }: Props) {
  const { roadmapId } = await params;
  const [session, roadmap] = await Promise.all([
    getServerSession(),
    loadRoadmap(roadmapId),
  ]);
  if (!roadmap) notFound();

  // Latest payment per not-yet-enrolled paid course, so a pending review isn't offered "Enroll" again.
  const paidCourseIds = roadmap.courses
    .filter((course) => !course.enrolled && courseRequiresPayment(course))
    .map((course) => course.id);
  const payments =
    session && paidCourseIds.length > 0
      ? await prisma.payment.findMany({
          where: { userId: session.user.id, courseId: { in: paidCourseIds } },
          orderBy: { createdAt: "desc" },
          select: { courseId: true, status: true, rejectionReason: true },
        })
      : [];
  const latestPayment = new Map<string, (typeof payments)[number]>();
  for (const payment of payments) {
    if (!latestPayment.has(payment.courseId)) {
      latestPayment.set(payment.courseId, payment);
    }
  }
  function paymentStateFor(courseId: string) {
    const payment = latestPayment.get(courseId);
    if (payment?.status === "PENDING") {
      return { paymentStatus: "pending" as const, rejectionReason: null };
    }
    if (payment?.status === "FAILED") {
      return {
        paymentStatus: "rejected" as const,
        rejectionReason: payment.rejectionReason,
      };
    }
    return { paymentStatus: "none" as const, rejectionReason: null };
  }

  return (
    <div className="bg-[#f7f8fc] pb-20">
      <section className="border-b border-black/5 bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-10 sm:px-5 sm:py-12 md:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-16 lg:py-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
              <span className="rounded-full bg-brand-teal/10 px-2.5 py-1 text-brand-teal">
                {roadmap.category ?? "Roadmap"}
              </span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-brand-navy">
                {formatLevel(roadmap.level)}
              </span>
            </div>
            <h1 className="mt-4 font-display text-2xl leading-tight text-brand-navy sm:text-3xl md:text-5xl">
              {roadmap.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              {roadmap.description ||
                "A sequenced path of courses with certificates along the way."}
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-[#324361]">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="size-4 text-brand-purple" />
                {pluralize(roadmap.courseCount, "course")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 text-brand-teal" />
                ~{roadmap.estimatedHours} hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Award className="size-4 text-brand-navy" />
                Path certificate
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-start gap-3">
              <RoadmapEnrollButton
                roadmapId={roadmap.id}
                slug={roadmap.slug}
                alreadyEnrolled={roadmap.enrolled}
                viewerRole={session?.user.role ?? null}
                courseCount={roadmap.courseCount}
              />
              <Button href="/roadmaps" variant="secondary">
                All roadmaps
              </Button>
            </div>
            {roadmap.enrolled ? (
              <p className="mt-4 text-sm text-muted">
                Progress:{" "}
                <strong className="text-brand-navy">
                  {roadmap.completedCount}/{roadmap.courseCount}
                </strong>{" "}
                courses · {Math.round(roadmap.progress)}%
              </p>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-3xl border border-black/5 bg-[#0b0a2e] shadow-xl">
            <div className="relative aspect-video">
              <Image
                src={roadmap.thumbnail}
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover opacity-90"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-brand-navy/25">
                <span className="flex size-16 items-center justify-center rounded-full bg-white/95 text-brand-navy shadow-lg">
                  <MapIcon className="size-8" />
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 text-center text-white">
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">{roadmap.courseCount}</p>
                <p className="text-xs text-white/60">Courses</p>
              </div>
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">
                  {roadmap.estimatedHours}h
                </p>
                <p className="text-xs text-white/60">Estimate</p>
              </div>
              <div className="px-3 py-4">
                <p className="text-lg font-semibold">
                  {roadmap.hasCertificate ? "Yes" : "Path"}
                </p>
                <p className="text-xs text-white/60">Certificate</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 md:px-10 lg:grid-cols-[1.4fr_0.6fr] lg:px-16">
        <div className="space-y-6">
          <section className="rounded-3xl border border-black/5 bg-white p-6 md:p-8">
            <h2 className="font-display text-2xl text-brand-navy">
              Courses in this path
            </h2>
            <p className="mt-1 text-sm text-muted">
              Taking them in this order is recommended. Each course earns its
              own certificate; finish them all for the roadmap certificate.
            </p>
            {paidCourseIds.length > 0 ? (
              <p className="mt-2 text-xs text-[#5c6b82]">
                Paid courses: pay via eSewa, mobile banking, or Khalti QR — then
                upload your screenshot.
              </p>
            ) : null}
            <ol className="mt-6 space-y-4">
              {roadmap.courses.map((course, index) => (
                <li
                  key={course.id}
                  className="rounded-2xl border border-black/5 p-4 sm:p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-bold text-brand-navy">
                        {index + 1}
                      </span>
                      <Image
                        src={resolveMediaUrl(course.thumbnail)}
                        alt=""
                        width={64}
                        height={64}
                        className="hidden size-16 rounded-xl object-cover sm:block"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {course.completed ? (
                            <CheckCircle2 className="size-4 text-brand-teal" />
                          ) : (
                            <Circle className="size-4 text-muted" />
                          )}
                          <Link
                            href={`/courses/${course.slug}`}
                            className="font-semibold text-[#324361] transition hover:text-brand-purple"
                          >
                            {course.title}
                          </Link>
                        </div>
                        <p className="mt-1 text-xs text-muted sm:text-sm">
                          {course.instructorName} ·{" "}
                          {formatDuration(course.duration)} ·{" "}
                          {formatCoursePrice(course)}
                        </p>
                        {course.enrolled ? (
                          <p className="mt-1 text-xs font-medium text-brand-teal">
                            {Math.round(course.progress)}% complete
                            {course.hasCertificate ? " · Certificate earned" : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 sm:min-w-40">
                      {course.enrolled ? (
                        <Button
                          href={
                            session?.user.role === "STUDENT"
                              ? `/student/courses/${course.slug}`
                              : `/courses/${course.slug}`
                          }
                          variant="secondary"
                          className="w-full text-sm"
                        >
                          Open course
                        </Button>
                      ) : (
                        <EnrollButton
                          courseId={course.id}
                          slug={course.slug}
                          courseTitle={course.title}
                          viewerRole={session?.user.role ?? null}
                          priceLabel={formatCoursePrice(course)}
                          requiresPayment={courseRequiresPayment(course)}
                          {...paymentStateFor(course.id)}
                          hidePaymentHint
                        />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          {roadmap.outcomes.length > 0 ? (
            <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <h3 className="font-display text-xl text-brand-navy">
                What you&apos;ll achieve
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm text-[#324361]">
                {roadmap.outcomes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h3 className="font-display text-xl text-brand-navy">Credentials</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <Award className="mt-0.5 size-4 text-brand-purple" />
                Certificate for each completed course
              </li>
              <li className="flex items-start gap-2">
                <Award className="mt-0.5 size-4 text-brand-teal" />
                Roadmap certificate after finishing every course
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
