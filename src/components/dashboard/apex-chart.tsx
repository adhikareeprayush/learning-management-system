"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[220px] items-center justify-center text-sm text-muted">
      Loading chart…
    </div>
  ),
});

type ApexChartProps = {
  type: "area" | "bar" | "line" | "donut" | "radialBar" | "radar";
  series: ApexOptions["series"];
  options: ApexOptions;
  height?: number | string;
  width?: number | string;
};

const brand = {
  navy: "#04016c",
  purple: "#7f56d9",
  blue: "#083f9b",
  teal: "#2aaa94",
  mint: "#4be5ca",
  muted: "#4e596b",
  grid: "#e8ecf4",
};

export const chartColors = brand;

export function ApexChart({
  type,
  series,
  options,
  height = 280,
  width = "100%",
}: ApexChartProps) {
  const merged: ApexOptions = {
    ...options,
    chart: {
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: "var(--font-saira), system-ui, sans-serif",
      background: "transparent",
      ...options.chart,
      animations: { enabled: false },
    },
    dataLabels: { enabled: false, ...options.dataLabels },
    stroke: { curve: "smooth", width: 2.5, ...options.stroke },
    grid: {
      borderColor: brand.grid,
      strokeDashArray: 4,
      ...options.grid,
    },
    tooltip: {
      theme: "light",
      ...options.tooltip,
    },
  };

  return (
    <ReactApexChart
      type={type}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      series={series as any}
      options={merged}
      height={height}
      width={width}
    />
  );
}
