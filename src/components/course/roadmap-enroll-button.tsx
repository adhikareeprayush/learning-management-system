"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { StaffEnrollNote } from "@/components/course/enroll-button";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { authClient } from "@/lib/auth-client";
import {
  enrollInRoadmap,
  loginWithRoadmapPath,
  registerWithRoadmapPath,
  roadmapEnrollMessage,
  studentRoadmapPath,
  type StaffEnrollNotice,
} from "@/lib/enroll-client";

type RoadmapEnrollButtonProps = {
  roadmapId: string;
  slug: string;
  alreadyEnrolled?: boolean;
  courseCount: number;
  /** Signed-in user's role, when the page knows it: staff get a preview link up front. */
  viewerRole?: string | null;
};

function roadmapStaffNotice(role: string | null, roadmapId: string): StaffEnrollNotice | null {
  if (role !== "ADMIN" && role !== "INSTRUCTOR") return null;
  return {
    role,
    previewHref:
      role === "ADMIN" ? `/admin/roadmaps/${encodeURIComponent(roadmapId)}` : "/instructor",
    message: `${role === "ADMIN" ? "Admin" : "Instructor"} accounts can't enroll in roadmaps. Use a student account to learn, or open the preview.`,
  };
}

export function RoadmapEnrollButton({
  roadmapId,
  slug,
  alreadyEnrolled = false,
  courseCount,
  viewerRole = null,
}: RoadmapEnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [staffNotice, setStaffNotice] = useState(() =>
    roadmapStaffNotice(viewerRole, roadmapId),
  );

  if (staffNotice) return <StaffEnrollNote notice={staffNotice} />;

  if (alreadyEnrolled) {
    return (
      <Button href={studentRoadmapPath(slug)} className="w-full sm:w-auto">
        Continue roadmap
      </Button>
    );
  }

  async function enroll() {
    setLoading(true);
    setError(null);
    setFlash(null);

    const session = await authClient.getSession();
    if (!session.data?.session) {
      setLoading(false);
      router.push(registerWithRoadmapPath(roadmapId, slug));
      return;
    }

    try {
      const result = await enrollInRoadmap(roadmapId);
      if (result.status === 401) {
        router.push(loginWithRoadmapPath(roadmapId, slug));
        return;
      }
      if (result.staff) {
        setStaffNotice(result.staff);
        return;
      }
      if (!result.ok || !result.roadmapSlug) {
        throw new Error(result.error ?? "Enrollment failed");
      }

      setFlash(roadmapEnrollMessage(result));
      window.location.assign(studentRoadmapPath(result.roadmapSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button onClick={enroll} loading={loading} className="w-full sm:w-auto">
        {loading
          ? "Starting…"
          : `Start roadmap · ${courseCount} course${courseCount === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}
