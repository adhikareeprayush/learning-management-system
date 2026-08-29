"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { authClient } from "@/lib/auth-client";
import {
  enrollInCourse,
  loginWithEnrollPath,
  registerWithEnrollPath,
  startKhaltiPayment,
  studentCoursePath,
} from "@/lib/enroll-client";

type EnrollButtonProps = {
  courseId: string;
  priceLabel: string;
  slug: string;
  alreadyEnrolled?: boolean;
  requiresPayment?: boolean;
};

function redirectAfterEnroll(slug: string) {
  window.location.assign(studentCoursePath(slug));
}

export function EnrollButton({
  courseId,
  priceLabel,
  slug,
  alreadyEnrolled = false,
  requiresPayment = false,
}: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (alreadyEnrolled) {
    return (
      <Button href={studentCoursePath(slug)} className="w-full sm:w-auto">
        Go to course
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
      router.push(registerWithEnrollPath(courseId, slug));
      return;
    }

    try {
      if (requiresPayment) {
        const payment = await startKhaltiPayment(courseId);

        if (payment.status === 401) {
          router.push(loginWithEnrollPath(courseId, slug));
          return;
        }

        if (!payment.ok || !payment.paymentUrl) {
          throw new Error(payment.error ?? "Could not start demo checkout");
        }

        setFlash("Opening Khalti sandbox checkout…");
        window.location.assign(payment.paymentUrl);
        return;
      }

      const result = await enrollInCourse(courseId);

      if (result.status === 401) {
        router.push(loginWithEnrollPath(courseId, slug));
        return;
      }

      if (result.paymentRequired) {
        const payment = await startKhaltiPayment(courseId);
        if (!payment.ok || !payment.paymentUrl) {
          throw new Error(payment.error ?? "Demo checkout is unavailable");
        }
        setFlash("Opening Khalti sandbox checkout…");
        window.location.assign(payment.paymentUrl);
        return;
      }

      if (!result.ok || !result.courseSlug) {
        throw new Error(result.error ?? "Enrollment failed");
      }

      setFlash(
        result.alreadyEnrolled
          ? "You're already enrolled — opening your course…"
          : result.roleChanged
            ? "Account switched to student — opening your course…"
            : "Enrolled! Opening your course…",
      );
      redirectAfterEnroll(result.courseSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  }

  const actionLabel = requiresPayment
    ? loading
      ? "Opening demo checkout…"
      : `Try demo checkout — ${priceLabel}`
    : loading
      ? "Enrolling…"
      : `Enroll — ${priceLabel}`;

  return (
    <div className="space-y-2">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {requiresPayment ? (
        <p className="text-xs text-[#5c6b82]">
          Portfolio demo — Khalti sandbox only. No real money is charged.
        </p>
      ) : null}
      <Button onClick={enroll} disabled={loading} className="w-full sm:w-auto">
        {actionLabel}
      </Button>
    </div>
  );
}
