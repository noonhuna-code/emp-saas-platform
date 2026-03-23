"use client";

import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/lib/site";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="container">
        <nav className="surface relative rounded-full border border-white/60 bg-white/72 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-5">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex items-center gap-2.5" href="/">
              <BrandLogo
                className="h-10 w-10 sm:h-11 sm:w-11"
                priority
                variant="mark"
              />
              <span className="text-[15px] font-semibold tracking-tight text-slate-950 sm:text-base">
                EMP
              </span>
            </Link>

            <div className="hidden items-center gap-2 md:flex">
              {siteConfig.nav.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    aria-current={isActive ? "page" : undefined}
                    data-analytics-location="navbar"
                    key={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                        : "text-slate-700 hover:bg-white hover:text-slate-950"
                    }`}
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                data-analytics-location="navbar"
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  pathname === "/sign-in"
                    ? "bg-white text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
                    : "text-slate-700 hover:bg-white hover:text-slate-950"
                }`}
                href="/sign-in"
              >
                Sign in
              </Link>
              <Link
                data-analytics-action="primary-cta"
                data-analytics-location="navbar"
                className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
                href="/demo"
              >
                Book Demo
              </Link>
            </div>

            <details className="group md:hidden">
              <summary
                aria-label="Toggle navigation menu"
                className="flex cursor-pointer list-none items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950"
              >
                Menu
              </summary>
              <div className="absolute inset-x-0 top-[calc(100%+0.75rem)] rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl">
                <div className="grid gap-2">
                  {siteConfig.nav.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        data-analytics-location="mobile-navbar"
                        key={item.href}
                        className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                          isActive
                            ? "bg-slate-950 text-white"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                        href={item.href}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                  <Link
                    data-analytics-location="mobile-navbar"
                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      pathname === "/sign-in"
                        ? "bg-slate-950 text-white"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                    href="/sign-in"
                  >
                    Sign in
                  </Link>
                  <Link
                    data-analytics-location="mobile-navbar"
                    className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    href="/sign-up"
                  >
                    Sign up
                  </Link>
                  <Link
                    data-analytics-action="primary-cta"
                    data-analytics-location="mobile-navbar"
                    className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.14)] transition hover:bg-slate-800"
                    href="/demo"
                  >
                    Book Demo
                  </Link>
                </div>
              </div>
            </details>
          </div>
        </nav>
      </div>
    </header>
  );
}
