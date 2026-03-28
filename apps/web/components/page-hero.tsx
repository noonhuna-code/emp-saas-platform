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
    <section className="relative overflow-hidden pb-8 pt-10 sm:pb-10 sm:pt-12 lg:pb-12 lg:pt-14">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(14,116,144,0.08),transparent_58%)]" />
      <div className="absolute inset-x-0 top-10 -z-10 h-48 bg-[linear-gradient(90deg,rgba(255,255,255,0.42),transparent_20%,transparent_80%,rgba(255,255,255,0.14))]" />
      <div className="container">
        {breadcrumbs ? (
          <div className="mb-5">
            <Breadcrumbs items={breadcrumbs} />
          </div>
        ) : null}
        <div className="grid gap-7 lg:gap-10 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start xl:gap-12">
          <div className="max-w-2xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl xl:text-[3.9rem] xl:leading-[1.02]">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              {description}
            </p>
            {actions.length ? (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
          </div>
          {aside ? <div className="xl:sticky xl:top-24 xl:max-w-[400px] xl:justify-self-end">{aside}</div> : null}
        </div>
      </div>
    </section>
  );
}
