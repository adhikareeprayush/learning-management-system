import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth";
import { homeForRole, loginRedirectPath } from "@/lib/page-guards";
import { sectionTitleMetadata } from "@/lib/institute";

export function generateMetadata(): Promise<Metadata> {
  return sectionTitleMetadata("Student");
}

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  if (!session) redirect(await loginRedirectPath());
  if (session.user.role !== "STUDENT") {
    redirect(homeForRole(session.user.role));
  }
  return <>{children}</>;
}
