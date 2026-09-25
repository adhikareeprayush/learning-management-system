import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { CredentialForm } from "./credential-form";

export const metadata: Metadata = {
  title: "Verify a certificate",
  description:
    "Check that a course or learning-path certificate was issued by this institute.",
};

type Props = { searchParams: Promise<{ id?: string | string[] }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { id } = await searchParams;
  const credentialId = (Array.isArray(id) ? id[0] : id)?.trim();
  if (credentialId) {
    redirect(`/verify/${encodeURIComponent(credentialId)}`);
  }

  return (
    <div className="bg-[#f7f8fc] pb-20">
      <PageHero
        eyebrow="Credentials"
        title={
          <>
            Verify a <span className="text-brand-mint">certificate</span>
          </>
        }
        description="Enter the credential ID printed at the bottom of a certificate to confirm it's genuine."
        icon={ShieldCheck}
      />
      <div className="mx-auto max-w-2xl px-5 py-12">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-8">
          <CredentialForm />
          <p className="mt-4 text-sm text-muted">
            Verification shows the holder&apos;s name, what they completed, and
            when it was issued. No contact details are shared.
          </p>
        </div>
      </div>
    </div>
  );
}
