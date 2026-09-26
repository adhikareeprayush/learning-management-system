import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudentDashboardView } from "@/components/dashboard/student-dashboard-view";
import { getServerSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/dashboard-data";
import { listPaymentsForStudent } from "@/lib/payments";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { loginRedirectPath } from "@/lib/page-guards";

export const metadata: Metadata = { title: "Student dashboard" };

export default async function StudentDashboardPage() {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());

  const ctx = await resolveTenantFromHeaders();
  if (!ctx) redirect(await loginRedirectPath());

  const [data, payments] = await Promise.all([
    getStudentDashboardData(session.user.id, ctx.organizationId),
    listPaymentsForStudent(session.user.id, ctx.organizationId),
  ]);

  return (
    <StudentDashboardView
      userName={session.user.name}
      initialData={data}
      payments={payments}
    />
  );
}
