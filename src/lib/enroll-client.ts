export type EnrollResponse = {
  enrollment?: { id: string };
  courseSlug?: string;
  roleChanged?: boolean;
  alreadyEnrolled?: boolean;
  error?: string;
};

export async function enrollInCourse(courseId: string): Promise<{
  ok: boolean;
  courseSlug?: string;
  roleChanged?: boolean;
  alreadyEnrolled?: boolean;
  error?: string;
  status: number;
  paymentRequired?: boolean;
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
  };
}

export async function startKhaltiPayment(courseId: string): Promise<{
  ok: boolean;
  paymentUrl?: string;
  error?: string;
  status: number;
}> {
  const res = await fetch("/api/payments/khalti/initiate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ courseId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    paymentUrl?: string;
    error?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error ?? "Could not start payment",
    };
  }

  return {
    ok: true,
    status: res.status,
    paymentUrl: data.paymentUrl,
  };
}

export function studentCoursePath(slug: string) {
  return `/student/courses/${slug}`;
}

export function studentRoadmapPath(slug: string) {
  return `/student/roadmaps/${slug}`;
}

export async function enrollInRoadmap(roadmapId: string): Promise<{
  ok: boolean;
  roadmapSlug?: string;
  roleChanged?: boolean;
  alreadyEnrolled?: boolean;
  coursesEnrolled?: number;
  error?: string;
  status: number;
}> {
  const res = await fetch("/api/roadmaps/enroll", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roadmapId }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    roadmapSlug?: string;
    roleChanged?: boolean;
    alreadyEnrolled?: boolean;
    coursesEnrolled?: number;
    error?: string;
  };

  if (res.status === 401) {
    return { ok: false, status: 401, error: data.error ?? "Unauthorized" };
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: data.error ?? "Enrollment failed",
    };
  }

  return {
    ok: true,
    status: res.status,
    roadmapSlug: data.roadmapSlug,
    roleChanged: data.roleChanged,
    alreadyEnrolled: data.alreadyEnrolled,
    coursesEnrolled: data.coursesEnrolled,
  };
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
