import type { ReactNode } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import type { ActionLink } from "@/lib/content";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  actions?: ActionLink[];
  aside?: ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions = [],
  aside
}: PageHeroProps) {
  return (
    <section className="section relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.12),transparent_55%)]" />
      <div className="absolute inset-x-0 top-12 -z-10 h-72 bg-[linear-gradient(90deg,rgba(255,255,255,0.46),transparent_18%,transparent_82%,rgba(255,255,255,0.18))]" />
      <div className="container">
        {breadcrumbs ? (
          <div className="mb-8">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        ) : null}
        <div className="grid gap-8 lg:gap-12 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start xl:gap-16">
          <div className="max-w-3xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-5 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl xl:text-[4.4rem] xl:leading-[1.02]">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              {description}
            </p>
            {actions.length ? (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {actions.map((action, index) => (
                  <Link
                    data-analytics-action={index === 0 ? "primary-cta" : "secondary-cta"}
                    data-analytics-location="page-hero"
                    key={action.href}
                    className={
                      index === 0
                        ? "inline-flex w-full items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(15,23,42,0.16)] transition hover:bg-slate-800 sm:w-auto"
                        : "inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950 sm:w-auto"
                    }
                    href={action.href}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Operational product walkthrough", "Pricing grounded in rollout scope", "Security and governance review"].map(
                (item) => (
                  <span
                    key={item}
                    className="rounded-[1.2rem] border border-slate-200 bg-white/88 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </div>
          {aside ? <div className="xl:sticky xl:top-28 xl:max-w-[430px] xl:justify-self-end">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
