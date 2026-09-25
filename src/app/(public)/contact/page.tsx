import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { resolveTenantFromHeaders } from "@/lib/tenant";

export const metadata: Metadata = {
  title: "Contact",
  description: "Email or call the institute.",
};

const FALLBACK_EMAIL = "hello@convolutionlabs.com";
const FALLBACK_LOCATION = "Kathmandu, Nepal";

function settingString(settings: unknown, ...keys: string[]) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }
  for (const key of keys) {
    const value = (settings as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export default async function ContactPage() {
  const ctx = await resolveTenantFromHeaders();
  const settings = ctx?.organization.settings;
  const name = ctx?.organization.name ?? "Convolution LMS";
  const email =
    settingString(settings, "contactEmail", "supportEmail", "email") ??
    FALLBACK_EMAIL;
  const phone = settingString(settings, "contactPhone", "phone");
  const location =
    settingString(settings, "address", "location") ?? FALLBACK_LOCATION;

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
        <ul className="grid gap-4 sm:grid-cols-2">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <li
                key={channel.label}
                className="rounded-2xl border border-black/5 bg-surface/40 p-5"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-white text-brand-purple shadow-sm">
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
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
                  <p className="mt-1 text-lg font-semibold text-brand-navy">
                    {channel.value}
                  </p>
                )}
                {channel.hint ? (
                  <p className="mt-1 text-sm text-muted">{channel.hint}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="space-y-4 text-muted">
          <p>
            There&apos;s no contact form on this site — write to us by email and
            the message goes straight to our inbox. Include your account email
            and, for payments, the course name so we can find your record.
          </p>
          <p>
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
