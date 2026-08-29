"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { authClient } from "@/lib/auth-client";
import {
  enrollInRoadmap,
  loginWithRoadmapPath,
  registerWithRoadmapPath,
  studentRoadmapPath,
} from "@/lib/enroll-client";

type RoadmapEnrollButtonProps = {
  roadmapId: string;
  slug: string;
  alreadyEnrolled?: boolean;
  courseCount: number;
};

export function RoadmapEnrollButton({
  roadmapId,
  slug,
  alreadyEnrolled = false,
  courseCount,
}: RoadmapEnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      if (!result.ok || !result.roadmapSlug) {
        throw new Error(result.error ?? "Enrollment failed");
      }

      setFlash(
        result.alreadyEnrolled
          ? "You're already on this roadmap — opening it…"
          : `Enrolled in ${courseCount} course${courseCount === 1 ? "" : "s"} — opening roadmap…`,
      );
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
      <Button onClick={enroll} disabled={loading} className="w-full sm:w-auto">
        {loading
          ? "Starting…"
          : `Start roadmap · ${courseCount} course${courseCount === 1 ? "" : "s"}`}
      </Button>
    </div>
  );
}
