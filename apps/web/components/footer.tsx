import Image from "next/image";
import { BrandLogo } from "@/components/brand-logo";
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
              <p className="eyebrow">Plan the next step with the EMP team</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                EMP is built for teams comparing employee records, approvals, payroll visibility,
                projects, collaboration, and workforce analytics in one place, with a direct line when product questions come up.
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
                  href="/demo"
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

        <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] xl:gap-12">
          <div className="max-w-xl">
            <div className="flex items-center gap-4">
              <BrandLogo className="h-11 w-11" variant="mark" />
              <span className="text-lg font-semibold tracking-tight text-slate-950">EMP</span>
            </div>
            <p className="mt-5 text-base leading-7 text-slate-600">
              EMP helps teams keep org hierarchy, reporting lines, leave approvals, attendance
              exceptions, employee records, project coordination, payroll visibility, and admin controls in one calmer workspace.
            </p>
            <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Product Signature
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  EMP Workforce OS
                </span>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div className="h-14 w-14 overflow-hidden rounded-[1rem] border border-slate-200 bg-slate-100 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
                  <Image
                    alt={`${siteConfig.founder.name}, founder of EMP`}
                    className="h-full w-full object-cover object-top"
                    height={112}
                    sizes="56px"
                    src={siteConfig.founder.image}
                    width={112}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Product Owner and Creator</p>
                  <p className="mt-1 text-lg font-semibold text-slate-950">{siteConfig.founder.name}</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{siteConfig.founder.title}</p>
                  <a className="mt-2 inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition hover:border-slate-300" href={`tel:${siteConfig.founder.phone}`}>
                    {siteConfig.founder.phone}
                  </a>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Reach out directly for demos, rollout planning, or product questions about how EMP
                fits your company structure, approval model, and operating workflows.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a className="inline-flex text-sm font-semibold text-slate-950 underline" href={`mailto:${siteConfig.founder.email}`}>
                  {siteConfig.founder.email}
                </a>
                <Link className="inline-flex text-sm font-semibold text-slate-950 underline" href="/company">
                  Read why EMP exists
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
            <a className="transition hover:text-slate-950" href={`mailto:${siteConfig.founder.email}`}>
              {siteConfig.founder.email}
            </a>
            <a className="transition hover:text-slate-950" href={`tel:${siteConfig.founder.phone}`}>
              {siteConfig.founder.phone}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
