"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Flag, Shield } from "lucide-react";
import {
  ApexChart,
  chartColors,
} from "@/components/dashboard/apex-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { StatsCard } from "@/components/dashboard/stats-card";
import { useLiveData } from "@/hooks/use-live-data";
import type { getAdminDashboardData } from "@/lib/dashboard-data";

type DashboardData = Awaited<ReturnType<typeof getAdminDashboardData>>;

export function AdminDashboardView({
  userName,
  initialData,
}: {
  userName: string;
  initialData: DashboardData;
}) {
  const { data, refreshedAt, refreshing } = useLiveData(
    "/api/admin/dashboard",
    initialData,
  );
  const {
    stats,
    platformGrowth,
    roleDistribution,
    moderationQueue,
    adminActivity,
    engagementWeekly,
  } = data;

  const totalUsers = roleDistribution.series.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title={`Admin · ${userName.split(" ")[0]}`}
        subtitle="Platform health, growth, and moderation."
        status={
          <LiveIndicator refreshedAt={refreshedAt} refreshing={refreshing} />
        }
      />

      <div className="flex items-center gap-2 rounded-xl border border-brand-purple/15 bg-[#f7f5ff] px-3 py-2 text-sm text-brand-navy">
        <Shield className="size-4 shrink-0 text-brand-purple" />
        Full platform access · live data
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        {stats.map((stat) => {
          const href =
            stat.id === "users"
              ? "/admin/users"
              : stat.id === "courses"
                ? "/admin/courses"
                : stat.id === "enrolled"
                  ? "/admin/reports"
                  : "/admin/users?q=Instructor";
          return (
            <Link key={stat.id} href={href} className="block min-w-0">
              <StatsCard
                id={stat.id}
                label={stat.label}
                value={stat.value}
                hint={stat.delta}
                tone={stat.tone}
              />
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Platform growth
            </h2>
            <p className="text-sm text-muted">Cumulative accounts over time</p>
          </div>
          <ApexChart
            type="area"
            height={280}
            series={platformGrowth.series}
            options={{
              colors: [chartColors.purple, chartColors.teal],
              fill: {
                type: "gradient",
                gradient: {
                  shadeIntensity: 1,
                  opacityFrom: 0.3,
                  opacityTo: 0.04,
                  stops: [0, 95, 100],
                },
              },
              xaxis: {
                categories: platformGrowth.categories,
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
          <div className="mb-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Role distribution
            </h2>
            <p className="text-sm text-muted">Accounts by role</p>
          </div>
          <ApexChart
            type="donut"
            height={280}
            series={roleDistribution.series}
            options={{
              labels: roleDistribution.labels,
              colors: [chartColors.blue, chartColors.teal, chartColors.purple],
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
                        formatter: () => String(totalUsers),
                      },
                    },
                  },
                },
              },
            }}
          />
        </section>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
            Weekly engagement
          </h2>
          <p className="text-sm text-muted">
            Learners who completed lessons · last 7 days
          </p>
        </div>
        <ApexChart
          type="bar"
          height={260}
          series={engagementWeekly.series}
          options={{
            colors: [chartColors.navy],
            plotOptions: {
              bar: { borderRadius: 6, columnWidth: "48%" },
            },
            xaxis: {
              categories: engagementWeekly.categories,
              axisBorder: { show: false },
              axisTicks: { show: false },
              labels: {
                style: { colors: chartColors.muted, fontSize: "10px" },
                rotate: -35,
                hideOverlappingLabels: true,
              },
            },
            yaxis: {
              labels: { style: { colors: chartColors.muted } },
            },
          }}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <Flag className="size-4 shrink-0 text-brand-purple" />
              <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
                Moderation queue
              </h2>
            </div>
            <Link
              href="/admin/moderation"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
            >
              Open
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {moderationQueue.length === 0 ? (
            <p className="text-sm text-muted">No courses awaiting review.</p>
          ) : (
            <ul className="space-y-3">
              {moderationQueue.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/admin/moderation?id=${item.id}`}
                    className="block rounded-xl border border-black/5 p-3 transition hover:border-brand-purple/25 hover:bg-surface/70"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-[#324361]">
                        {item.title}
                      </p>
                      <span className="shrink-0 rounded-md bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-purple">
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {item.instructor} · {item.submitted}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 className="size-4 text-brand-teal" />
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              Admin activity
            </h2>
          </div>
          <ul className="space-y-4">
            {adminActivity.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-teal" />
                <div className="min-w-0">
                  <p className="text-sm text-[#324361]">{item.text}</p>
                  <p className="mt-0.5 text-xs text-muted">{item.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
