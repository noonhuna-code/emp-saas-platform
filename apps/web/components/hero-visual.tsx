import Image from "next/image";

export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="surface relative overflow-hidden rounded-[2rem] p-5"
      data-screenshot-slot="homepage-hero-visual"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_28%)]" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200/80 bg-white/90 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Live operating view
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-950">Northstar Group</p>
          </div>
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Workforce command view
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/95 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
          <Image
            alt=""
            aria-hidden="true"
            className="h-auto w-full rounded-[1.15rem]"
            height={1000}
            priority
            sizes="(min-width: 1024px) 520px, 100vw"
            src="/screenshots/homepage-hero-visual.svg"
            unoptimized
            width={1600}
          />
        </div>

        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-950">Leadership pulse</p>
              <p className="mt-1 text-sm text-slate-600">
                Cross-functional visibility across teams, approvals, and workforce pressure.
              </p>
            </div>
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
              Executive view
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Staffing pressure", "2 teams need coverage planning"],
              ["Policy watch", "Leave overlap rising in Support"],
              ["Action queue", "13 priority reviews before payroll"]
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                <p className="text-sm font-semibold text-slate-950">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Example leadership view across approvals, staffing pressure, and operating risk
          </p>
        </div>
      </div>
    </div>
  );
}
