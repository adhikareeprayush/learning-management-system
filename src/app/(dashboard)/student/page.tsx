import { redirect } from "next/navigation";
import { StudentDashboardView } from "@/components/dashboard/student-dashboard-view";
import { getServerSession } from "@/lib/auth";
import { getStudentDashboardData } from "@/lib/dashboard-data";

export default async function StudentDashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const data = await getStudentDashboardData(session.user.id);

  return (
    <StudentDashboardView userName={session.user.name} initialData={data} />
  );
}
