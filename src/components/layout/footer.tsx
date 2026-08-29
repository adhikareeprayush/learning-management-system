import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NewsletterSignup } from "@/components/layout/newsletter-signup";

const columns = [
  {
    title: "About",
    links: [
      { label: "About us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Blog", href: "/blog" },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Roadmaps", href: "/roadmaps" },
      { label: "All courses", href: "/courses" },
      { label: "Instructors", href: "/instructors" },
      { label: "Pricing", href: "/pricing" },
      { label: "Student dashboard", href: "/student" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-footer text-white">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-14 md:grid-cols-2 md:px-10 lg:grid-cols-6 lg:px-16">
        <div className="space-y-4 lg:col-span-2">
          <Logo inverted />
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            A full-stack learning demo — courses, roadmaps, certificates, and
            admin tools you can click through.
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="mb-4 font-display text-lg">{col.title}</h3>
            <ul className="space-y-2 text-sm text-white/70">
              {col.links.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="hover:text-brand-mint">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="lg:col-span-2">
          <NewsletterSignup />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-5 text-sm text-white/60 md:flex-row md:items-center md:justify-between md:px-10 lg:px-16">
          <p>© {new Date().getFullYear()} Edujarr. All rights reserved.</p>
          <p className="flex gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
