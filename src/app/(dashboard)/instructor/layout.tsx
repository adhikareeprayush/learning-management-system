import { requireInstructorPage } from "@/lib/page-guards";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireInstructorPage();
  return <>{children}</>;
}
