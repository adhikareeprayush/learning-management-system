"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Users } from "lucide-react";
import {
  ApexChart,
  chartColors,
} from "@/components/dashboard/apex-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { ProgressBar } from "@/components/dashboard/progress-bar";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Button } from "@/components/ui/button";
import { useLiveData } from "@/hooks/use-live-data";
import type { getInstructorDashboardData } from "@/lib/dashboard-data";

type DashboardData = Awaited<ReturnType<typeof getInstructorDashboardData>>;

function formatStatus(status: string) {
  if (status === "PUBLISHED") return "Published";
  if (status === "IN_REVIEW") return "In review";
  if (status === "DRAFT") return "Draft";
  return status;
}

export function InstructorDashboardView({
  userName,
  initialData,
}: {
  userName: string;
  initialData: DashboardData;
}) {
  const { data, refreshedAt, refreshing } = useLiveData(
    "/api/instructor/dashboard",
    initialData,
  );
  const {
    stats,
    instructorCourses,
    recentStudents,
    enrollmentTrend,
    revenueMix,
    instructorActivity,
  } = data;

  const totalRevenue = revenueMix.series.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title={`Welcome back, ${userName.split(" ")[0]}`}
        subtitle="Teaching performance and course health."
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Enrollment trend
            </h2>
            <p className="text-sm text-muted">New students over the last 6 months</p>
          </div>
          <ApexChart
            type="area"
            height={260}
            series={enrollmentTrend.series}
            options={{
              colors: [chartColors.teal],
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
                categories: enrollmentTrend.categories,
                axisBorder: { show: false },
                axisTicks: { show: false },
                labels: { style: { colors: chartColors.muted } },
              },
              yaxis: {
                labels: { style: { colors: chartColors.muted } },
              },
            }}
          />
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Revenue mix
            </h2>
            <p className="text-sm text-muted">Enrollment value by course</p>
          </div>
          {revenueMix.labels.length > 0 ? (
            <ApexChart
              type="donut"
              height={280}
              series={revenueMix.series}
              options={{
                labels: revenueMix.labels,
                colors: [chartColors.purple, chartColors.blue, chartColors.mint],
                legend: { position: "bottom", fontSize: "12px" },
                plotOptions: {
                  pie: {
                    donut: {
                      size: "68%",
                      labels: {
                        show: true,
                        total: {
                          show: true,
                          label: "Total",
                          formatter: () => `$${totalRevenue.toFixed(0)}`,
                        },
                      },
                    },
                  },
                },
              }}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted">
              Create courses to see revenue breakdown.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.85fr)] xl:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Your courses
            </h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button href="/instructor/courses/create" className="h-9 px-3 text-sm">
                Create
              </Button>
              <Link
                href="/instructor/courses"
                className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
              >
                Manage
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          {instructorCourses.length === 0 ? (
            <p className="text-sm text-muted">No courses yet. Create your first one.</p>
          ) : (
            <ul className="space-y-3">
              {instructorCourses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/instructor/courses/${course.id}`}
                    className="flex gap-3 rounded-xl border border-black/5 p-3 transition hover:bg-surface/70"
                  >
                    <img
                      src={course.image}
                      alt=""
                      className="size-14 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-[#324361]">
                          {course.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            course.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {formatStatus(course.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {course.students} students · {course.lessons} lessons
                      </p>
                      <div className="mt-2">
                        <ProgressBar value={course.progress} label="Avg learner progress" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Users className="size-4 text-brand-purple" />
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Recent students
            </h2>
          </div>
          {recentStudents.length === 0 ? (
            <p className="text-sm text-muted">No enrollments yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentStudents.map((s) => (
                <li
                  key={`${s.id}-${s.course}`}
                  className="rounded-xl border border-black/5 p-3 transition hover:bg-surface/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-[#324361]">{s.name}</p>
                    <span className="text-[11px] text-muted">{s.enrolled}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{s.course}</p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/instructor/students"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
          >
            All students
            <ArrowRight className="size-4" />
          </Link>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-brand-teal" />
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Activity
            </h2>
          </div>
          {instructorActivity.length === 0 ? (
            <p className="text-sm text-muted">No recent activity.</p>
          ) : (
            <ul className="space-y-4">
              {instructorActivity.map((item) => (
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
    </div>
  );
}
