import Image from "next/image";

export function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="surface relative overflow-hidden rounded-[2rem] p-4 sm:p-5"
      data-screenshot-slot="homepage-hero-visual"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_24%)]" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between rounded-[1.35rem] border border-slate-200/80 bg-white/94 px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Live product view
            </p>
            <p className="mt-1 text-base font-semibold text-slate-950">Admin operations workspace</p>
          </div>
          <div className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
            Real EMP screen
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white/96 p-2 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <Image
            alt="EMP dashboard showing the real admin operations workspace with approvals, billing, payroll, and monitoring access."
            className="h-auto w-full rounded-[1.15rem]"
            height={1000}
            priority
            sizes="(min-width: 1024px) 520px, 100vw"
            src="/screenshots/homepage-hero-visual.jpg"
            quality={92}
            width={1600}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Approvals, payroll, and monitoring in one shell", "Product-first proof"],
            ["Visible routing by role, capability, and entitlement", "Scoped access"],
            ["Real queues, cards, and workflow states", "No mock UI"]
          ].map(([title, meta]) => (
            <div key={title} className="rounded-[1.35rem] border border-slate-200/80 bg-white/90 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <p className="text-sm font-semibold text-slate-950">{title}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{meta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
