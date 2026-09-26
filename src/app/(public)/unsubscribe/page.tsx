import type { Metadata } from "next";
import Link from "next/link";
import { MailX } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { getNewsletterSubscriber } from "@/lib/newsletter";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { ConfirmUnsubscribe } from "./confirm-unsubscribe";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Stop receiving newsletter emails.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ s?: string | string[]; t?: string | string[] }> };

function first(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** "priya.sharma@example.com" → "pr•••••••••@example.com" */
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const params = await searchParams;
  const subscriberId = first(params.s);
  const token = first(params.t);
  const valid = verifyUnsubscribeToken(subscriberId, token);
  const subscriber = valid ? await getNewsletterSubscriber(subscriberId) : null;

  return (
    <div className="bg-[#f7f8fc] pb-20">
      <PageHero
        eyebrow="Newsletter"
        title={
          <>
            Email <span className="text-brand-mint">preferences</span>
          </>
        }
        description="Stop receiving newsletter updates from us."
        icon={MailX}
      />
      <div className="mx-auto max-w-xl px-5 py-12">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:p-8">
          {!valid ? (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-brand-navy">
                This link doesn&apos;t work
              </h2>
              <p className="text-muted">
                The unsubscribe link is incomplete or no longer valid. Use the
                &ldquo;Unsubscribe&rdquo; link at the bottom of our most recent
                email, or{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-brand-purple hover:text-brand-teal"
                >
                  contact us
                </Link>{" "}
                and we&apos;ll remove you.
              </p>
            </div>
          ) : !subscriber || subscriber.status === "UNSUBSCRIBED" ? (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-brand-navy">
                You&apos;re unsubscribed
              </h2>
              <p className="text-muted">
                {subscriber ? `${maskEmail(subscriber.email)} won't` : "This address won't"}{" "}
                receive any more newsletter emails from us.
              </p>
            </div>
          ) : (
            <ConfirmUnsubscribe
              subscriberId={subscriber.id}
              token={token}
              maskedEmail={maskEmail(subscriber.email)}
            />
          )}
          <p className="mt-6 border-t border-black/5 pt-4 text-sm text-muted">
            Account emails such as password resets, payment updates and
            certificates are sent separately and aren&apos;t affected.
          </p>
        </div>
      </div>
    </div>
  );
}
