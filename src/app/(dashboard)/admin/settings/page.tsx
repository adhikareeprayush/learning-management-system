import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { readOrganizationSettings } from "@/app/api/admin/organization/organization-settings";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/page-guards";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { OrganizationSettingsForm } from "./organization-settings-form";

export default async function AdminSettingsPage() {
  await requireAdminPage();

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect("/login");

  const { organization } = ctx;
  const [courseCount, userCount, paymentPending] = await Promise.all([
    prisma.course.count({ where: { organizationId: organization.id } }),
    prisma.user.count(),
    prisma.payment.count({
      where: {
        status: "PENDING",
        course: { organizationId: organization.id },
      },
    }),
  ]);

  const summary = [
    { label: "Courses", value: courseCount, href: "/admin/courses" },
    { label: "Users", value: userCount, href: "/admin/users" },
    { label: "Pending payments", value: paymentPending, href: "/admin/payments" },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Settings"
        subtitle={`${organization.name} · institute profile and platform setup`}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5">
        <OrganizationSettingsForm
          slug={organization.slug}
          initialValues={readOrganizationSettings(organization)}
        />

        <div className="space-y-4 lg:space-y-5">
          <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-base font-semibold text-brand-navy">Institute summary</h2>
            <ul className="mt-3 divide-y divide-black/5">
              {summary.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="group flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="text-muted">{item.label}</span>
                    <span className="flex items-center gap-1.5 font-display text-xl text-brand-navy">
                      {item.value}
                      <ArrowRight className="size-3.5 text-muted transition group-hover:text-brand-purple" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-muted shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
            <h2 className="text-base font-semibold text-brand-navy">Media & payments</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Lesson videos upload to YouTube (unlisted) when YOUTUBE_* is set.</li>
              <li>Screenshots and images use ImageKit when IMAGEKIT_* is set.</li>
              <li>
                Course purchases use manual payment proof — manage methods under{" "}
                <Link href="/admin/payments" className="font-semibold text-brand-purple hover:text-brand-teal">
                  Payments
                </Link>
                .
              </li>
              <li>Newsletter email delivery isn&apos;t configured yet.</li>
            </ul>
          </section>

          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
