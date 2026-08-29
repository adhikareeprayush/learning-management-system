import { CourseForm } from "@/components/course/course-form";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function CreateCoursePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
      <DashboardHeader
        title="Create course"
        subtitle="Create a new course draft and start building your curriculum."
      />
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-6">
        <CourseForm />
      </div>
    </div>
  );
}
