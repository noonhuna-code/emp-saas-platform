import Link from "next/link";
import type { ActionLink } from "@/lib/content";

type CTASectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  primary: ActionLink;
  secondary?: ActionLink;
};

export function CTASection({
  eyebrow,
  title,
  description,
  primary,
  secondary
}: CTASectionProps) {
  return (
    <section className="section">
      <div className="container">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-slate-900/10 bg-slate-950 px-6 py-10 text-white shadow-[0_34px_120px_rgba(15,23,42,0.26)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(250,204,21,0.08),transparent_24%)]" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
            <div className="max-w-3xl">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">{eyebrow}</p>
              <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.8rem]">
                {title}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">{description}</p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link
                  data-analytics-action="primary-cta"
                  data-analytics-location="cta-section"
                  className="inline-flex w-full items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 sm:w-auto"
                  href={primary.href}
                >
                  {primary.label}
                </Link>
                {secondary ? (
                  <Link
                    data-analytics-action="secondary-cta"
                    data-analytics-location="cta-section"
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
                    href={secondary.href}
                  >
                    {secondary.label}
                  </Link>
                ) : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Guided demo", "Directional pricing", "Rollout planning"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.12)] xl:self-stretch">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Evaluation format
              </p>
              <div className="mt-4 grid gap-3">
                {["30 to 45 minute walkthrough", "Role-based product review", "Commercial and rollout discussion"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                    >
                      {item}
                    </div>
                  )
                )}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Built to move buyers from curiosity into a grounded product conversation without
                pretending the site can replace rollout scoping.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
