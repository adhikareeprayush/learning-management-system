import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

// no-referrer keeps the token in the URL from leaking to other sites.
export const metadata: Metadata = {
  title: "Reset password",
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="font-display text-3xl text-[#323232]">
        Choose a new password
      </h1>
      <p className="mt-2 text-muted">
        You&apos;ll be signed out on all devices and can sign in with the new
        password right away.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
