"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { MobileNavbarAuth, NavbarAuth } from "@/components/layout/navbar-auth";
import { mainNav } from "@/lib/nav";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = useId();

  return (
    <header className="relative z-50 w-full border-b border-black/[0.04] bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:h-[72px] sm:px-5 md:px-10 lg:px-16">
        <Logo />

        <nav className="hidden lg:block" aria-label="Primary">
          <ul className="flex items-center gap-7">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex py-2 text-[15px] font-medium transition hover:text-brand-teal ${
                    isActive(pathname, item.href)
                      ? "text-brand-teal"
                      : "text-[#1b2336]"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <NavbarAuth />
        </div>

        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl border border-black/10 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div
          id={panelId}
          className="border-t border-black/5 bg-white px-4 py-4 lg:hidden"
        >
          <ul className="space-y-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block py-2.5 text-base font-semibold text-[#1b2336]"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <MobileNavbarAuth onNavigate={() => setMobileOpen(false)} />
        </div>
      ) : null}
    </header>
  );
}
