import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { canSendEmail } from "@/lib/email";
import { getEmailBranding } from "@/lib/email-layout";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  const { supportEmail } = await getEmailBranding();

  return (
    <div>
      <h1 className="font-display text-3xl text-[#323232]">
        Forgot your password?
      </h1>
      <p className="mt-2 text-muted">
        Enter your account email and we&apos;ll send you a link to choose a new
        one.
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <ForgotPasswordForm
            emailEnabled={canSendEmail()}
            supportEmail={supportEmail}
          />
        </Suspense>
      </div>
    </div>
  );
}
