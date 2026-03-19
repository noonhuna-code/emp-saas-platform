import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 pb-8 pt-16">
      <div className="container">
        <div
          className="rounded-[2rem] border border-slate-200/80 bg-white/72 px-6 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.05)] backdrop-blur sm:px-8"
          data-footer-reveal="true"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="eyebrow">Enterprise buying flow</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Product, pricing, security, legal, and contact paths are aligned so buyers can move
                from research into a confident product conversation without friction.
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:items-end">
              <div className="flex flex-wrap gap-3">
                {siteConfig.trustBadges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
                  >
                    {badge}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  href="/contact"
                >
                  Book demo
                </Link>
                <Link
                  className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
                  href="/security"
                >
                  Review security
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="max-w-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                E
              </span>
              <div>
                <p className="text-base font-semibold text-slate-950">{siteConfig.name}</p>
                <p className="text-sm text-slate-500">Workforce OS for modern organizations</p>
              </div>
            </div>
            <p className="mt-5 text-base leading-7 text-slate-600">
              EMP helps growing companies replace fragmented HR and operational workflows with a
              more structured system for people, approvals, collaboration, and executive insight.
            </p>
            <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white/80 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Support and sales
              </p>
              <a className="mt-3 block text-base font-semibold text-slate-950 underline" href={`mailto:${siteConfig.email}`}>
                {siteConfig.email}
              </a>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use the shared inbox for demo requests, buying questions, implementation planning,
                and launch support handoff.
              </p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
            {siteConfig.footerNav.map((group) => (
              <div key={group.title}>
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {group.title}
                </h2>
                <ul className="mt-4 grid gap-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        className="text-base text-slate-700 transition hover:text-slate-950"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200/80 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>(c) {new Date().getFullYear()} {siteConfig.name}. Built for modern workforce operations.</p>
          <div className="flex flex-wrap items-center gap-4">
            {siteConfig.footerMetaLinks.map((link) => (
              <Link key={link.href} className="transition hover:text-slate-950" href={link.href}>
                {link.label}
              </Link>
            ))}
            <a className="transition hover:text-slate-950" href={`mailto:${siteConfig.email}`}>
              {siteConfig.email}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
