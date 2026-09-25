import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChangePasswordForm } from "@/components/profile/change-password-form";

export default function InstructorSettingsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Settings"
        subtitle="Manage your account security."
      />
      <ChangePasswordForm />
      <p className="text-sm text-muted">
        Your name, photo, and public teaching details are edited on your{" "}
        <Link href="/instructor/profile" className="font-semibold text-brand-purple hover:text-brand-teal">
          profile
        </Link>
        .
      </p>
    </div>
  );
}
