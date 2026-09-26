"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Flame,
  Receipt,
} from "lucide-react";
import {
  ApexChart,
  chartColors,
} from "@/components/dashboard/apex-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  PaymentStatusBadge,
  resubmittablePaymentIds,
} from "@/components/student/payment-status-badge";
import { useLiveData } from "@/hooks/use-live-data";
import type { getStudentDashboardData } from "@/lib/dashboard-data";
import { coursePurchasePath } from "@/lib/enroll-client";
import { formatDate } from "@/lib/format";
import type { StudentPaymentSummary } from "@/lib/payments";
import { formatNprFromPaisa } from "@/lib/pricing";

type DashboardData = Awaited<ReturnType<typeof getStudentDashboardData>>;

function PaymentsCard({ payments }: { payments: StudentPaymentSummary[] }) {
  const resubmittable = resubmittablePaymentIds(payments);

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="size-4 text-brand-purple" />
          <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
            Payments
          </h2>
        </div>
        <Link
          href="/student/payments"
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
        >
          View all
          <ArrowRight className="size-4" />
        </Link>
      </div>
      <ul className="divide-y divide-black/5">
        {payments.map((payment) => {
          const canResubmit = resubmittable.has(payment.id);
          return (
            <li
              key={payment.id}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <div className="min-w-0">
                <Link
                  href={
                    payment.enrolled
                      ? `/student/courses/${payment.course.slug}`
                      : `/courses/${payment.course.slug}`
                  }
                  className="block truncate text-sm font-semibold text-[#324361] transition hover:text-brand-purple"
                >
                  {payment.course.title}
                </Link>
                <p className="mt-0.5 text-xs text-muted">
                  {formatNprFromPaisa(payment.amount)} · Submitted{" "}
                  {formatDate(payment.createdAt)}
                </p>
                {payment.status === "FAILED" ? (
                  <p className="mt-1 text-xs text-red-700">
                    Reason:{" "}
                    {payment.rejectionReason?.trim() ||
                      "The payment could not be verified."}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <PaymentStatusBadge status={payment.status} />
                {canResubmit ? (
                  <Link
                    href={coursePurchasePath(payment.course.slug)}
                    className="text-xs font-semibold text-brand-purple transition hover:text-brand-teal"
                  >
                    Resubmit
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function averageProgress(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

const priorityStyles = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-emerald-50 text-emerald-700",
};

export function StudentDashboardView({
  userName,
  initialData,
  payments = [],
}: {
  userName: string;
  initialData: DashboardData;
  payments?: StudentPaymentSummary[];
}) {
  const { data, refreshedAt, refreshing } = useLiveData(
    "/api/student/dashboard",
    initialData,
  );
  const {
    stats,
    continueLearning,
    upcomingDeadlines,
    activityFeed,
    completionByCategory,
    monthlyProgress,
    weeklyLearningHours,
    streakDays,
  } = data;
  const categoryAverage = averageProgress(completionByCategory.series);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title={`Welcome back, ${userName.split(" ")[0]}`}
        subtitle="Your learning progress and upcoming work."
        status={
          <LiveIndicator refreshedAt={refreshedAt} refreshing={refreshing} />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.id}
            id={stat.id}
            label={stat.label}
            value={stat.value}
            hint={stat.delta}
            tone={stat.tone}
          />
        ))}
      </div>

      {payments.length > 0 ? <PaymentsCard payments={payments} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
                Weekly learning hours
              </h2>
              <p className="text-sm text-muted">Lesson time completed · last 7 days</p>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-brand-navy">
              <Flame className="size-3.5 text-brand-teal" />
              {streakDays}-day streak
            </span>
          </div>
          <ApexChart
            type="area"
            height={260}
            series={weeklyLearningHours.series}
            options={{
              colors: [chartColors.purple],
              fill: {
                type: "gradient",
                gradient: {
                  shadeIntensity: 1,
                  opacityFrom: 0.35,
                  opacityTo: 0.05,
                  stops: [0, 95, 100],
                },
              },
              xaxis: {
                categories: weeklyLearningHours.categories,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: {
                  style: { colors: chartColors.muted, fontSize: "10px" },
                  rotate: -35,
                  hideOverlappingLabels: true,
                },
              },
              yaxis: {
                labels: {
                  style: { colors: chartColors.muted },
                  formatter: (v) => `${v}h`,
                },
              },
            }}
          />
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
                Completion by category
              </h2>
              <p className="text-sm text-muted">Average progress across topics</p>
            </div>
            {completionByCategory.labels.length > 0 ? (
              <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-brand-navy">
                Avg {categoryAverage}%
              </span>
            ) : null}
          </div>
          {completionByCategory.labels.length > 0 ? (
            <ApexChart
              type="bar"
              height={280}
              series={[{ name: "Progress", data: completionByCategory.series }]}
              options={{
                colors: [chartColors.teal],
                plotOptions: {
                  bar: {
                    horizontal: true,
                    borderRadius: 6,
                    barHeight: "58%",
                  },
                },
                dataLabels: {
                  enabled: true,
                  formatter: (value) => `${value}%`,
                  style: {
                    fontSize: "11px",
                    fontWeight: 600,
                    colors: ["#324361"],
                  },
                  offsetX: 6,
                },
                xaxis: {
                  categories: completionByCategory.labels,
                  max: 100,
                  axisBorder: { show: false },
                  axisTicks: { show: false },
                  labels: {
                    style: { colors: chartColors.muted },
                    formatter: (value) => `${value}%`,
                  },
                },
                yaxis: {
                  labels: {
                    style: { colors: chartColors.navy, fontSize: "11px" },
                  },
                },
                grid: {
                  xaxis: { lines: { show: true } },
                  yaxis: { lines: { show: false } },
                },
                tooltip: {
                  y: { formatter: (value) => `${value}%` },
                },
              }}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted">
              Enroll in courses to see category progress.
            </p>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Monthly progress
            </h2>
            <p className="text-sm text-muted">Lessons completed over time</p>
          </div>
          <ApexChart
            type="bar"
            height={280}
            series={monthlyProgress.series}
            options={{
              colors: [chartColors.blue, chartColors.teal],
              plotOptions: {
                bar: { borderRadius: 6, columnWidth: "48%" },
              },
              xaxis: {
                categories: monthlyProgress.categories,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: chartColors.muted } },
              },
              yaxis: {
                labels: { style: { colors: chartColors.muted } },
              },
              legend: {
                position: "top",
                horizontalAlign: "right",
                fontSize: "12px",
              },
            }}
          />
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-brand-teal" />
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Recent activity
            </h2>
          </div>
          {activityFeed.length === 0 ? (
            <p className="text-sm text-muted">Complete a lesson to see activity.</p>
          ) : (
            <ul className="space-y-4">
              {activityFeed.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-teal" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#324361]">{item.text}</p>
                    <p className="mt-0.5 text-xs text-muted">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Continue learning
            </h2>
            <Link
              href="/student/courses"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
            >
              View all
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {continueLearning.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/10 px-4 py-10 text-center">
              <p className="text-sm text-muted">No courses in progress.</p>
              <Link
                href="/courses"
                className="mt-3 inline-flex text-sm font-semibold text-brand-purple"
              >
                Browse catalog
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {continueLearning.map((course) => (
                <Link
                  key={course.id}
                  href={`/student/courses/${course.slug}`}
                  className="flex gap-3 rounded-xl border border-black/5 p-3 transition hover:bg-surface/70 sm:gap-4 sm:p-3.5"
                >
                  <Image
                    src={course.image}
                    alt=""
                    width={64}
                    height={64}
                    className="size-14 shrink-0 rounded-lg object-cover sm:size-16"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[#324361]">
                      {course.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted sm:text-sm">
                      {course.category} · {course.instructor}
                    </p>
                    <div className="mt-2.5">
                      <ProgressBar value={course.progress} label="Progress" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="size-4 text-brand-purple" />
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Upcoming deadlines
            </h2>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-muted">No upcoming assignments.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingDeadlines.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-black/5 p-3 transition hover:bg-surface/70"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#324361]">
                      {item.title}
                    </p>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityStyles[item.priority]}`}
                    >
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{item.course}</p>
                  <p className="mt-2 text-xs font-medium text-brand-navy">
                    Due {item.due}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/student/assignments"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
          >
            All assignments
            <ArrowRight className="size-4" />
          </Link>
        </section>

      </div>
    </div>
  );
}
