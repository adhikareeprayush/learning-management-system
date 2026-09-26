import type { Metadata } from "next";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export const metadata: Metadata = { title: "Settings" };

export default function StudentSettingsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Settings"
        subtitle="Manage your account security."
      />
      <ChangePasswordForm />
    </div>
  );
}
