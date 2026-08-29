"use client";

import { type ReactNode } from "react";
import {
  useRegisterDashboardPageHeader,
  type DashboardPageHeaderState,
} from "@/components/dashboard/dashboard-page-header-context";

export type DashboardHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  status?: ReactNode;
};

/** Registers page title with the persistent dashboard chrome (no DOM output). */
export function DashboardHeader({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  status,
}: DashboardHeaderProps) {
  const page: DashboardPageHeaderState = {
    title,
    subtitle,
    backHref,
    backLabel,
    status,
  };

  useRegisterDashboardPageHeader(page);

  return null;
}
