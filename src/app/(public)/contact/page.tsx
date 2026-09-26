import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { readOrganizationSettings } from "@/app/api/admin/organization/organization-settings";
import { PageHero } from "@/components/layout/page-hero";
import { getServerSession } from "@/lib/auth";
import { getDefaultOrganization } from "@/lib/default-org";
import { contactFormAvailable } from "@/lib/emails/contact-email";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send a message, email or call the institute.",
};

const FALLBACK_EMAIL = "hello@convolutionlabs.com";
const FALLBACK_LOCATION = "Kathmandu, Nepal";

/** Older records kept contact details under keys the settings form doesn't write. */
function legacySetting(settings: unknown, ...keys: string[]) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return "";
  }
  for (const key of keys) {
    const value = (settings as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export default async function ContactPage() {
  const [org, session] = await Promise.all([
    getDefaultOrganization().catch(() => null),
    getServerSession().catch(() => null),
  ]);
  const settings = org ? readOrganizationSettings(org) : null;

  const name = settings?.name || "Convolution LMS";
  const email =
    settings?.supportEmail ||
    legacySetting(org?.settings, "contactEmail", "email") ||
    FALLBACK_EMAIL;
  const phone = settings?.contactPhone || legacySetting(org?.settings, "phone");
  const location =
    settings?.address || legacySetting(org?.settings, "location") || FALLBACK_LOCATION;
  const formAvailable = contactFormAvailable(org);

  const channels = [
    {
      icon: Mail,
      label: "Email",
      value: email,
      href: `mailto:${email}`,
      hint: "Best for course, payment, and certificate questions.",
    },
    ...(phone
      ? [
          {
            icon: Phone,
            label: "Phone",
            value: phone,
            href: `tel:${phone.replace(/[^\d+]/g, "")}`,
            hint: "During office hours.",
          },
        ]
      : []),
    {
      icon: MapPin,
      label: "Location",
      value: location,
      href: null,
      hint: null,
    },
  ];

  return (
    <div className="bg-white pb-20">
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Get in <span className="text-brand-mint">touch</span>
          </>
        }
        description={`Questions about a course, a payment, or a certificate? Reach ${name} directly.`}
        icon={Mail}
      />
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 md:grid-cols-[1.1fr_0.9fr] md:px-10 lg:px-16">
        {formAvailable ? (
          <ContactForm
            defaultName={session?.user.name ?? ""}
            defaultEmail={session?.user.email ?? ""}
            fallbackEmail={email}
          />
        ) : (
          <div className="rounded-3xl border border-black/5 bg-surface/40 p-6 text-muted md:p-8">
            <h2 className="text-xl font-semibold text-brand-navy">Write to us</h2>
            <p className="mt-2">
              The contact form is unavailable right now. Email us at{" "}
              <a
                href={`mailto:${email}`}
                className="font-semibold text-brand-purple hover:text-brand-teal"
              >
                {email}
              </a>{" "}
              and include your account email and, for payments, the course name
              so we can find your record.
            </p>
          </div>
        )}
        <div className="space-y-6">
          <ul className="grid gap-4">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <li
                  key={channel.label}
                  className="flex gap-4 rounded-2xl border border-black/5 bg-surface/40 p-5"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-purple shadow-sm">
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      {channel.label}
                    </p>
                    {channel.href ? (
                      <a
                        href={channel.href}
                        className="mt-1 block break-words text-lg font-semibold text-brand-navy transition hover:text-brand-purple"
                      >
                        {channel.value}
                      </a>
                    ) : (
                      <p className="mt-1 whitespace-pre-line text-lg font-semibold text-brand-navy">
                        {channel.value}
                      </p>
                    )}
                    {channel.hint ? (
                      <p className="mt-1 text-sm text-muted">{channel.hint}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="text-muted">
            Many common questions are already answered in the{" "}
            <Link
              href="/faq"
              className="font-semibold text-brand-purple hover:text-brand-teal"
            >
              FAQ
            </Link>
            . To check a certificate, use{" "}
            <Link
              href="/verify"
              className="font-semibold text-brand-purple hover:text-brand-teal"
            >
              credential verification
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
