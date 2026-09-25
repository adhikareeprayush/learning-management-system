import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NewsletterForm } from "@/components/layout/newsletter-form";

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

export function Footer() {
  return (
    <footer className="bg-footer text-white">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:px-10 lg:grid-cols-[1.1fr_1fr_1fr] lg:px-16">
        <div className="max-w-sm space-y-3">
          <Logo inverted />
          <p className="text-sm leading-relaxed text-white/70">
            Courses, roadmaps, certificates, and manual payment enrollment.
          </p>
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
          © {new Date().getFullYear()} Convolution LMS
        </p>
      </div>
    </footer>
  );
}
