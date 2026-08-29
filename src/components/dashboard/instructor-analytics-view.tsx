"use client";

import {
  ApexChart,
  chartColors,
} from "@/components/dashboard/apex-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { StatsCard } from "@/components/dashboard/stats-card";
import { useLiveData } from "@/hooks/use-live-data";
import type { getInstructorAnalyticsData } from "@/lib/dashboard-data";

type AnalyticsData = Awaited<ReturnType<typeof getInstructorAnalyticsData>>;

function averageProgress(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function InstructorAnalyticsView({
  initialData,
}: {
  initialData: AnalyticsData;
}) {
  const { data, refreshedAt, refreshing } = useLiveData(
    "/api/instructor/analytics",
    initialData,
  );
  const { stats, watchTimeWeekly, completionByCourse, enrollmentTrend } = data;
  const completionAverage = averageProgress(completionByCourse.series);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Analytics"
        subtitle="Watch time, completion, and enrollment trends from your courses."
        status={
          <LiveIndicator refreshedAt={refreshedAt} refreshing={refreshing} />
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((stat) => (
          <StatsCard
            key={stat.id}
            id={stat.id}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            tone={stat.tone}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Weekly watch time
            </h2>
            <p className="text-sm text-muted">Hours from lesson completions · last 7 days</p>
          </div>
          <ApexChart
            type="bar"
            height={280}
            series={watchTimeWeekly.series}
            options={{
              colors: [chartColors.blue],
              plotOptions: {
                bar: { borderRadius: 6, columnWidth: "48%" },
              },
              xaxis: {
                categories: watchTimeWeekly.categories,
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
                Completion by course
              </h2>
              <p className="text-sm text-muted">Average learner progress</p>
            </div>
            {completionByCourse.labels.length > 0 ? (
              <span className="shrink-0 rounded-lg bg-surface px-2.5 py-1 text-xs font-semibold text-brand-navy">
                Avg {completionAverage}%
              </span>
            ) : null}
          </div>
          {completionByCourse.labels.length > 0 ? (
            <ApexChart
              type="bar"
              height={300}
              series={[{ name: "Progress", data: completionByCourse.series }]}
              options={{
                colors: [chartColors.purple],
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
                  categories: completionByCourse.labels,
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
              Publish a course to see completion breakdown.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
            Enrollment growth
          </h2>
          <p className="text-sm text-muted">Six-month trajectory</p>
        </div>
        <ApexChart
          type="line"
          height={280}
          series={enrollmentTrend.series}
          options={{
            colors: [chartColors.purple],
            markers: { size: 4 },
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
    </div>
  );
}
