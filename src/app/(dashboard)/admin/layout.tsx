import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/page-guards";
import { sectionTitleMetadata } from "@/lib/institute";

export function generateMetadata(): Promise<Metadata> {
  return sectionTitleMetadata("Admin");
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage();
  return <>{children}</>;
}
