type RoadmapStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type CourseStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";

export const roadmapStatusLabels: Record<RoadmapStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const roadmapStatusStyles: Record<RoadmapStatus, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  DRAFT: "bg-slate-100 text-slate-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

const courseStatusLabels: Record<CourseStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Review",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

const courseStatusStyles: Record<CourseStatus, string> = {
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  IN_REVIEW: "bg-amber-50 text-amber-800",
  DRAFT: "bg-slate-100 text-slate-700",
  ARCHIVED: "bg-red-50 text-red-700",
};

export function RoadmapStatusBadge({ status }: { status: RoadmapStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${roadmapStatusStyles[status]}`}
    >
      {roadmapStatusLabels[status]}
    </span>
  );
}

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${courseStatusStyles[status]}`}
    >
      {courseStatusLabels[status]}
    </span>
  );
}
