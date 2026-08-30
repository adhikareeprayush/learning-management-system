"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FlashBanner } from "@/components/ui/flash-banner";
import { PaymentEnrollmentModal } from "@/components/course/payment-enrollment-modal";
import { authClient } from "@/lib/auth-client";
import {
  enrollInCourse,
  loginWithEnrollPath,
  registerWithEnrollPath,
  studentCoursePath,
} from "@/lib/enroll-client";

type EnrollButtonProps = {
  courseId: string;
  priceLabel: string;
  slug: string;
  courseTitle: string;
  alreadyEnrolled?: boolean;
  requiresPayment?: boolean;
  paymentStatus?: "none" | "pending" | "rejected";
};

function redirectAfterEnroll(slug: string) {
  window.location.assign(studentCoursePath(slug));
}

export function EnrollButton({
  courseId,
  priceLabel,
  slug,
  courseTitle,
  alreadyEnrolled = false,
  requiresPayment = false,
  paymentStatus = "none",
}: EnrollButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [localPaymentStatus, setLocalPaymentStatus] = useState(paymentStatus);

  if (alreadyEnrolled) {
    return (
      <Button href={studentCoursePath(slug)} className="w-full sm:w-auto">
        Go to course
      </Button>
    );
  }

  async function enrollFree() {
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
      const result = await enrollInCourse(courseId);

      if (result.status === 401) {
        router.push(loginWithEnrollPath(courseId, slug));
        return;
      }

      if (result.paymentRequired) {
        setShowPaymentModal(true);
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

  async function handleEnrollClick() {
    if (requiresPayment) {
      const session = await authClient.getSession();
      if (!session.data?.session) {
        router.push(registerWithEnrollPath(courseId, slug));
        return;
      }
      if (localPaymentStatus === "pending") return;
      setShowPaymentModal(true);
      return;
    }
    await enrollFree();
  }

  function handlePaymentSubmitted() {
    setLocalPaymentStatus("pending");
    setShowPaymentModal(false);
    setFlash("Payment submitted. You'll be enrolled once an admin approves it.");
  }

  const actionLabel = requiresPayment
    ? localPaymentStatus === "pending"
      ? "Payment under review"
      : localPaymentStatus === "rejected"
        ? `Resubmit payment — ${priceLabel}`
        : loading
          ? "Loading…"
          : `Enroll — ${priceLabel}`
    : loading
      ? "Enrolling…"
      : `Enroll — ${priceLabel}`;

  return (
    <div className="space-y-2">
      <FlashBanner message={flash} onDismiss={() => setFlash(null)} />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {requiresPayment && localPaymentStatus === "pending" ? (
        <p className="text-xs text-[#5c6b82]">
          Your payment proof is being reviewed. You'll get access once approved.
        </p>
      ) : requiresPayment ? (
        <p className="text-xs text-[#5c6b82]">
          Pay via eSewa, mobile banking, or Khalti QR — then upload your screenshot.
        </p>
      ) : null}
      <Button
        onClick={handleEnrollClick}
        disabled={loading || (requiresPayment && localPaymentStatus === "pending")}
        className="w-full sm:w-auto"
      >
        {actionLabel}
      </Button>

      {showPaymentModal ? (
        <PaymentEnrollmentModal
          courseId={courseId}
          courseTitle={courseTitle}
          priceLabel={priceLabel}
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSubmitted={handlePaymentSubmitted}
        />
      ) : null}
    </div>
  );
}
