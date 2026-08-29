import { redirect } from "next/navigation";
import { DashboardChrome } from "@/components/dashboard/dashboard-chrome";
import { DashboardPageHeaderProvider } from "@/components/dashboard/dashboard-page-header-context";
import { DashboardUserProvider } from "@/components/dashboard/dashboard-user-context";
import { Sidebar } from "@/components/layout/sidebar";
import { getServerSession } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  const user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role: session.user.role ?? "STUDENT",
  };

  return (
    <DashboardUserProvider user={user}>
      <DashboardPageHeaderProvider>
        <div className="min-h-screen bg-[#f4f6fb] lg:flex">
          <Sidebar />
          <div className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 md:px-8 lg:px-10 lg:py-8">
            <DashboardChrome />
            {children}
          </div>
        </div>
      </DashboardPageHeaderProvider>
    </DashboardUserProvider>
  );
}
