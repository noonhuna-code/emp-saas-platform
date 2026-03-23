import Image from "next/image";

type SnapshotMetric = {
  label: string;
  value: string;
};

type SnapshotActivity = {
  title: string;
  meta: string;
  status: string;
};

type PlatformSnapshotProps = {
  slotId: string;
  eyebrow: string;
  title: string;
  description: string;
  sidebarTitle: string;
  sidebarSubtitle: string;
  sidebarItems: string[];
  metrics: SnapshotMetric[];
  activityTitle: string;
  activityItems: SnapshotActivity[];
  footerNote: string;
};

const screenshotMap = {
  "homepage-platform-overview": {
    src: "/screenshots/homepage-platform-overview.svg",
    alt: "EMP platform overview showing org structure, approvals, workforce metrics, and leadership analytics."
  },
  "product-workspace-overview": {
    src: "/screenshots/product-workspace-overview.svg",
    alt: "EMP workspace view showing connected teams, approvals, and operational insight."
  },
  "modules-workspace-overview": {
    src: "/screenshots/modules-workspace-overview.svg",
    alt: "EMP modules overview showing attendance, leave, analytics, approvals, and related workflows."
  },
  "security-review-overview": {
    src: "/screenshots/security-review-overview.svg",
    alt: "EMP security review view showing permissions, audit records, and governance controls."
  },
  "pricing-rollout-overview": {
    src: "/screenshots/pricing-rollout-overview.svg",
    alt: "EMP pricing and rollout view showing plan comparison, onboarding phases, and rollout readiness."
  },
  "contact-demo-overview": {
    src: "/screenshots/contact-demo-overview.svg",
    alt: "EMP guided demo view showing agenda, product highlights, and buyer walkthrough steps."
  }
} as const;

export function PlatformSnapshot({
  slotId,
  eyebrow,
  title,
  description,
  sidebarTitle,
  sidebarSubtitle,
  sidebarItems,
  metrics,
  activityTitle,
  activityItems,
  footerNote
}: PlatformSnapshotProps) {
  const screenshot = screenshotMap[slotId as keyof typeof screenshotMap];

  return (
    <div
      className="surface relative overflow-hidden rounded-[2.2rem] p-5 sm:p-6"
      data-screenshot-slot={slotId}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.10),transparent_22%)]" />
      <div className="relative">
        <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200/80 bg-white/94 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Product snapshot
          </p>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-[1.7rem] border border-slate-900/10 bg-slate-950 p-5 text-white shadow-[0_25px_80px_rgba(15,23,42,0.24)]">
            <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">{eyebrow}</p>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">{description}</p>
            <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold">{sidebarTitle}</p>
              <p className="mt-1 text-sm text-slate-400">{sidebarSubtitle}</p>
            </div>
            <div className="mt-4 grid gap-3">
              {sidebarItems.map((item) => (
                <div
                  key={item}
                  className="rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                className="rounded-[1.55rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
              >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.8rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{activityTitle}</p>
                  <p className="mt-1 text-sm text-slate-500">Connected workspace view</p>
                </div>
                <span className="w-fit rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                  Guided view
                </span>
              </div>
              {screenshot ? (
                <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-2 shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
                  <Image
                    alt={screenshot.alt}
                    className="h-auto w-full rounded-[1rem]"
                    height={1000}
                    sizes="(min-width: 1280px) 720px, (min-width: 1024px) 55vw, 100vw"
                    src={screenshot.src}
                    unoptimized
                    width={1600}
                  />
                </div>
              ) : null}
              <div className="mt-5 grid gap-3">
                {activityItems.map((item) => (
                  <div
                    key={item.title}
                  className="flex flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
                  </div>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
                      {item.status}
                    </span>
                </div>
              ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white/72 px-5 py-4 text-sm leading-7 text-slate-600">
              <div>
                <p>{footerNote}</p>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                  Product visuals, walkthroughs, and role-based views
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
