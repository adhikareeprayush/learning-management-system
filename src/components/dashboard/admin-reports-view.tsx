"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Wallet } from "lucide-react";
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
import { formatNprFromPaisa } from "@/lib/pricing";

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
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `convolution-labs-report-${period}.csv`;
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
                  ? "bg-brand-blue text-white"
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

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatsCard
          id="revenue"
          label="Revenue"
          value={formatNprFromPaisa(data.revenue.periodPaisa)}
          hint={`${formatNprFromPaisa(data.revenue.totalPaisa)} all time`}
          tone="teal"
        />
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

      <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-brand-teal" />
              <h2 className="text-base font-semibold text-brand-navy sm:text-lg">
                Revenue by course
              </h2>
            </div>
            <p className="text-sm text-muted">
              Approved payments · {data.revenue.periodPayments} in {data.label.toLowerCase()}
            </p>
          </div>
          <Link
            href="/admin/payments"
            className="text-sm font-semibold text-brand-purple transition hover:text-brand-teal"
          >
            Review payments
          </Link>
        </div>
        {data.revenue.byCourse.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            No approved payments yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-surface/80 text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Course</th>
                  <th className="px-4 py-2.5 text-right font-medium">Payments</th>
                  <th className="px-4 py-2.5 text-right font-medium">{data.label}</th>
                  <th className="px-4 py-2.5 text-right font-medium">All time</th>
                </tr>
              </thead>
              <tbody>
                {data.revenue.byCourse.map((row) => (
                  <tr key={row.courseId} className="border-t border-black/5">
                    <td className="px-4 py-3 font-medium text-[#324361]">
                      <Link
                        href={`/admin/courses/${row.courseId}`}
                        className="hover:text-brand-purple"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {row.periodPayments}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                      {formatNprFromPaisa(row.periodPaisa)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted">
                      {formatNprFromPaisa(row.totalPaisa)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-black/10">
                  <td className="px-4 py-3 font-semibold text-brand-navy">Total</td>
                  <td className="px-4 py-3 text-right text-muted">
                    {data.revenue.periodPayments}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                    {formatNprFromPaisa(data.revenue.periodPaisa)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                    {formatNprFromPaisa(data.revenue.totalPaisa)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
