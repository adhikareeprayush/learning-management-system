import type { Metadata } from "next";
import { requireInstructorPage } from "@/lib/page-guards";
import { sectionTitleMetadata } from "@/lib/institute";

export function generateMetadata(): Promise<Metadata> {
  return sectionTitleMetadata("Instructor");
}

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireInstructorPage();
  return <>{children}</>;
}
