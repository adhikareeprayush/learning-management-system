/** Returned (403) when an instructor/admin tries to enroll; see staffEnrollBlock. */
export type StaffEnrollNotice = {
  role: "ADMIN" | "INSTRUCTOR";
  previewHref: string;
  message: string;
};

export type EnrollResponse = {
  enrollment?: { id: string };
  courseSlug?: string;
  roleChanged?: boolean;
  alreadyEnrolled?: boolean;
  error?: string;
  staff?: StaffEnrollNotice;
};

export async function enrollInCourse(courseId: string): Promise<{
  ok: boolean;
  courseSlug?: string;
  roleChanged?: boolean;
  alreadyEnrolled?: boolean;
  error?: string;
  status: number;
  paymentRequired?: boolean;
  staff?: StaffEnrollNotice;
}> {
  const res = await fetch("/api/student/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
  const data = (await res.json().catch(() => ({}))) as EnrollResponse;

  if (res.status === 401) {
    return { ok: false, status: 401, error: data.error ?? "Unauthorized" };
  }

  if (res.ok || res.status === 409) {
    return {
      ok: true,
      status: res.status,
      courseSlug: data.courseSlug,
      roleChanged: data.roleChanged,
      alreadyEnrolled: res.status === 409 || data.alreadyEnrolled,
    };
  }

  return {
    ok: false,
    status: res.status,
    error: data.error ?? "Enrollment failed",
    paymentRequired: res.status === 402,
    staff: data.staff,
  };
}

export async function submitCoursePayment(input: {
  courseId: string;
  paymentMethodId: string;
  screenshotUrl: string;
  referenceNote?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  status: number;
}> {
  const res = await fetch("/api/payments/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error ?? "Could not submit payment",
    };
  }

  return { ok: true, status: res.status };
}

export function studentCoursePath(slug: string) {
  return `/student/courses/${slug}`;
}

export function studentRoadmapPath(slug: string) {
  return `/student/roadmaps/${slug}`;
}

export type RoadmapCourseEnrollSummary = {
  courseId: string;
  slug: string;
  title: string;
  status: "enrolled" | "already_enrolled" | "payment_required" | "failed";
  error?: string;
};

export type EnrollRoadmapClientResult = {
  ok: boolean;
  roadmapSlug?: string;
  roleChanged?: boolean;
  alreadyEnrolled?: boolean;
  coursesEnrolled?: number;
  enrolledCount?: number;
  paymentRequiredCount?: number;
  courses?: RoadmapCourseEnrollSummary[];
  error?: string;
  status: number;
  staff?: StaffEnrollNotice;
};

export async function enrollInRoadmap(
  roadmapId: string,
): Promise<EnrollRoadmapClientResult> {
  const res = await fetch("/api/roadmaps/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roadmapId }),
  });
  const data = (await res.json().catch(() => ({}))) as Omit<
    EnrollRoadmapClientResult,
    "ok" | "status"
  >;

  if (res.status === 401) {
    return { ok: false, status: 401, error: data.error ?? "Unauthorized" };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error ?? "Enrollment failed",
      staff: data.staff,
    };
  }

  return {
    ok: true,
    status: res.status,
    roadmapSlug: data.roadmapSlug,
    roleChanged: data.roleChanged,
    alreadyEnrolled: data.alreadyEnrolled,
    coursesEnrolled: data.coursesEnrolled,
    enrolledCount: data.enrolledCount,
    paymentRequiredCount: data.paymentRequiredCount,
    courses: data.courses,
  };
}

/** Human summary of a roadmap enrollment for flash messages. */
export function roadmapEnrollMessage(result: EnrollRoadmapClientResult) {
  const newly = result.coursesEnrolled ?? 0;
  const paid = result.paymentRequiredCount ?? 0;
  const parts: string[] = [];
  if (result.alreadyEnrolled && newly === 0) {
    parts.push("You're already on this roadmap");
  } else {
    parts.push(
      newly > 0
        ? `Enrolled in ${newly} course${newly === 1 ? "" : "s"}`
        : "Roadmap started",
    );
  }
  if (paid > 0) {
    parts.push(
      `${paid} paid course${paid === 1 ? " needs" : "s need"} to be purchased`,
    );
  }
  return `${parts.join(" · ")} — opening roadmap…`;
}

/** Public course page with the payment modal opened on arrival. */
export function coursePurchasePath(slugOrId: string) {
  return `/courses/${encodeURIComponent(slugOrId)}?pay=1`;
}

export function registerWithEnrollPath(courseId: string, slug: string) {
  const params = new URLSearchParams({ enroll: courseId, slug });
  return `/register?${params.toString()}`;
}

export function loginWithEnrollPath(courseId: string, slug: string) {
  const params = new URLSearchParams({
    enroll: courseId,
    slug,
    next: `/courses/${slug}`,
  });
  return `/login?${params.toString()}`;
}

export function registerWithRoadmapPath(roadmapId: string, slug: string) {
  const params = new URLSearchParams({ roadmap: roadmapId, slug });
  return `/register?${params.toString()}`;
}

export function loginWithRoadmapPath(roadmapId: string, slug: string) {
  const params = new URLSearchParams({
    roadmap: roadmapId,
    slug,
    next: `/roadmaps/${slug}`,
  });
  return `/login?${params.toString()}`;
}
