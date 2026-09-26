import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeaderProvider } from "@/components/dashboard/dashboard-page-header-context";
import { DashboardUserProvider } from "@/components/dashboard/dashboard-user-context";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { Sidebar } from "@/components/layout/sidebar";
import { getServerSession } from "@/lib/auth";
import { canSendEmail } from "@/lib/email";
import { getInstituteProfile } from "@/lib/institute";
import { loginRedirectPath } from "@/lib/page-guards";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, institute] = await Promise.all([
    getServerSession(),
    getInstituteProfile(),
  ]);
  if (!session) {
    redirect(await loginRedirectPath());
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role ?? "STUDENT",
    emailVerified: session.user.emailVerified,
  };

  return (
    <DashboardUserProvider user={user}>
      <DashboardPageHeaderProvider>
        <div className="min-h-screen bg-[#f4f6fb] lg:flex">
          <Sidebar brandName={institute.name} logoUrl={institute.logoUrl} />
          <div className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
            {!user.emailVerified && canSendEmail() ? (
              <VerifyEmailBanner email={user.email} />
            ) : null}
            <DashboardChrome />
            {children}
          </div>
        </div>
      </DashboardPageHeaderProvider>
    </DashboardUserProvider>
  );
}
