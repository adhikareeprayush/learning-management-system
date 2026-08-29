"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  ApexChart,
  chartColors,
} from "@/components/dashboard/apex-chart";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { StatsCard } from "@/components/dashboard/stats-card";
import { FlashBanner } from "@/components/ui/flash-banner";
import { useLiveData } from "@/hooks/use-live-data";
import type {
  getAdminReportsData,
  ReportPeriodKey,
} from "@/lib/dashboard-data";

type ReportsData = Awaited<ReturnType<typeof getAdminReportsData>>;

const periodKeys: ReportPeriodKey[] = ["7d", "30d", "6m"];

export function AdminReportsView({
  reportsByPeriod,
}: {
  reportsByPeriod: Record<ReportPeriodKey, ReportsData>;
}) {
  const [period, setPeriod] = useState<ReportPeriodKey>("30d");
  const [flash, setFlash] = useState<string | null>(null);
  const { data, refreshedAt, refreshing } = useLiveData(
    `/api/admin/reports?period=${period}`,
    reportsByPeriod[period],
  );

  const growthSeries = useMemo(
    () =>
      data.growth.series.map((s) => ({
        name: s.name,
        data: [...s.data],
      })),
    [data],
  );

  const sessionSeries = useMemo(
    () =>
      data.sessions.series.map((s) => ({
        name: s.name,
        data: [...s.data],
      })),
    [data],
  );

  function exportCsv() {
    const csv = data.exportRows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `edujarr-report-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setFlash(`Exported live report for ${data.label}.`);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Reports"
        subtitle="Growth, engagement, and category share from live platform data."
        status={
          <LiveIndicator refreshedAt={refreshedAt} refreshing={refreshing} />
        }
      />

      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {periodKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                period === key
                  ? "bg-[#083f9b] text-white"
                  : "border border-black/8 bg-white text-muted hover:bg-surface hover:text-brand-navy"
              }`}
            >
              {reportsByPeriod[key].label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-black/8 bg-white px-3 text-sm font-semibold text-brand-navy transition hover:bg-surface"
        >
          <Download className="size-4" />
          Export CSV
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <StatsCard
          id="enrolled"
          label="Active learners"
          value={data.stats.mau}
          hint={data.stats.mauHint}
          tone="purple"
        />
        <StatsCard
          id="hours"
          label="Lesson hours"
          value={data.stats.hours}
          hint={data.stats.hoursHint}
          tone="navy"
        />
        <StatsCard
          id="due"
          label="Completion rate"
          value={data.stats.completion}
          hint={data.stats.completionHint}
          tone="mint"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
              User growth
            </h2>
            <p className="text-sm text-muted">{data.label}</p>
          </div>
          <ApexChart
            type="line"
            height={280}
            series={growthSeries}
            options={{
              colors: [chartColors.purple, chartColors.teal],
              markers: { size: 3 },
              xaxis: {
                categories: [...data.growth.categories],
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
              Category share
            </h2>
            <p className="text-sm text-muted">Enrollments by topic</p>
          </div>
          {data.categoryShare.labels.length > 0 ? (
            <ApexChart
              type="donut"
              height={280}
              series={data.categoryShare.series}
              options={{
                labels: data.categoryShare.labels,
                colors: [
                  chartColors.purple,
                  chartColors.teal,
                  chartColors.blue,
                  chartColors.mint,
                  chartColors.navy,
                ],
                legend: { position: "bottom", fontSize: "11px" },
              }}
            />
          ) : (
            <p className="py-12 text-center text-sm text-muted">
              No enrollment data yet.
            </p>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
            Lesson completions
          </h2>
          <p className="text-sm text-muted">Engagement intensity · {data.label}</p>
        </div>
        <ApexChart
          type="area"
          height={260}
          series={sessionSeries}
          options={{
            colors: [chartColors.blue],
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
              categories: [...data.sessions.categories],
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
