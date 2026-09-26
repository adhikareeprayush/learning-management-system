import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import type { InstituteProfile } from "@/lib/institute";

const links = [
  { label: "Courses", href: "/courses" },
  { label: "Roadmaps", href: "/roadmaps" },
  { label: "Instructors", href: "/instructors" },
  { label: "Verify a certificate", href: "/verify" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export function Footer({ institute }: { institute: InstituteProfile }) {
  return (
    <footer className="bg-footer text-white">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:px-10 lg:grid-cols-[1.1fr_1fr_1fr] lg:px-16">
        <div className="max-w-sm space-y-3">
          <Logo inverted name={institute.name} logoUrl={institute.logoUrl} />
          <p className="text-sm leading-relaxed text-white/70">
            Self-paced courses, learning paths, and certificates anyone can
            verify.
          </p>
          {institute.supportEmail || institute.contactPhone ? (
            <ul className="space-y-1 text-sm text-white/70">
              {institute.supportEmail ? (
                <li>
                  <a
                    href={`mailto:${institute.supportEmail}`}
                    className="break-all hover:text-brand-mint"
                  >
                    {institute.supportEmail}
                  </a>
                </li>
              ) : null}
              {institute.contactPhone ? (
                <li>
                  <a
                    href={`tel:${institute.contactPhone.replace(/[^\d+]/g, "")}`}
                    className="hover:text-brand-mint"
                  >
                    {institute.contactPhone}
                  </a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70">
            {links.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-brand-mint">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <NewsletterForm />
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-[1440px] px-4 py-4 text-sm text-white/50 sm:px-6 md:px-10 lg:px-16">
          © {new Date().getFullYear()} {institute.name}
        </p>
      </div>
    </footer>
  );
}
