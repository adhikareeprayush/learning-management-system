import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { resolveTenantFromHeaders } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export default async function AdminSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/student");

  const ctx = await resolveTenantFromHeaders();
  const org = ctx
    ? await prisma.organization.findUnique({ where: { id: ctx.organizationId } })
    : null;

  const [courseCount, userCount, paymentPending] = await Promise.all([
    ctx
      ? prisma.course.count({ where: { organizationId: ctx.organizationId } })
      : 0,
    prisma.user.count(),
    ctx
      ? prisma.payment.count({
          where: {
            status: "PENDING",
            course: { organizationId: ctx.organizationId },
          },
        })
      : 0,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">
          {org?.name ?? "Edujarr"} — institute overview
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Courses", courseCount],
          ["Users", userCount],
          ["Pending payments", paymentPending],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-white p-6 text-sm text-slate-600">
        <h2 className="font-semibold text-brand-navy">Media & payments</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5">
          <li>Lesson videos upload to YouTube (unlisted) when YOUTUBE_* is set.</li>
          <li>Screenshots and images use ImageKit when IMAGEKIT_* is set.</li>
          <li>
            Course purchases use manual payment proof — manage methods under
            Payments.
          </li>
        </ul>
      </section>
    </div>
  );
}
