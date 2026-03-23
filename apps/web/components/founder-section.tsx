import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site";

type FounderSectionProps = {
  compact?: boolean;
};

export function FounderSection({ compact = false }: FounderSectionProps) {
  if (compact) {
    return (
      <article className="rounded-[1.75rem] border border-slate-200/80 bg-white/82 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100">
            <Image
              alt={`${siteConfig.founder.name}, founder of EMP`}
              className="h-full w-full object-cover object-top"
              height={160}
              sizes="64px"
              src={siteConfig.founder.image}
              width={160}
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Founder note
            </p>
            <p className="mt-1 text-base font-semibold text-slate-950">{siteConfig.founder.title}</p>
          </div>
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight text-slate-950">
          Founder access stays available, but the product story stays company-first.
        </h2>
        <p className="mt-4 text-base leading-7 text-slate-600">
          EMP focuses on the work companies still chase manually: employee records, reporting lines,
          approvals, attendance exceptions, payroll visibility, collaboration, and admin controls
          that stay clear as the organization grows.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <a
            className="text-sm font-semibold text-slate-950 underline"
            href={`mailto:${siteConfig.founder.email}`}
          >
            {siteConfig.founder.email}
          </a>
          <Link className="text-sm font-semibold text-slate-950 underline" href="/company">
            Read the company note
          </Link>
        </div>
      </article>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="grid gap-8 rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.06)] lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center lg:p-8">
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
            <Image
              alt={`${siteConfig.founder.name}, founder of EMP`}
              className="h-full w-full object-cover"
              height={900}
              sizes="(min-width: 1024px) 280px, 100vw"
              src={siteConfig.founder.image}
              width={700}
            />
          </div>

          <div className="max-w-3xl">
            <p className="eyebrow">Company and founder note</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              A founder-led product with a company-first trust posture.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              EMP focuses on the day-to-day work most companies still chase manually: employee
              records, reporting lines, approvals, attendance exceptions, payroll visibility,
              projects, collaboration, policy execution, and admin controls that stay readable as the team grows.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                "Founder accountability stays visible",
                "Direct product and rollout conversations",
                "Built around real approvals and workforce workflows"
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-slate-200 bg-slate-50/90 px-4 py-4 text-sm font-medium text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                {siteConfig.founder.title}
              </span>
              <a
                className="text-base font-semibold text-slate-950 underline"
                href={`mailto:${siteConfig.founder.email}`}
              >
                {siteConfig.founder.email}
              </a>
              <Link className="text-base font-semibold text-slate-950 underline" href="/company">
                Company note
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
