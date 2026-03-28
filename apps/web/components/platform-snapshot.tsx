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
    src: "/screenshots/homepage-platform-overview.jpg",
    alt: "EMP approvals workspace showing a real approval queue and workflow context."
  },
  "product-workspace-overview": {
    src: "/screenshots/product-workspace-overview.jpg",
    alt: "EMP people workspace showing real employee records and people operations."
  },
  "modules-workspace-overview": {
    src: "/screenshots/modules-workspace-overview.jpg",
    alt: "EMP attendance team workspace showing real attendance and team coverage operations."
  },
  "security-review-overview": {
    src: "/screenshots/security-review-overview.jpg",
    alt: "EMP monitoring workspace showing real security and system monitoring surfaces."
  },
  "pricing-rollout-overview": {
    src: "/screenshots/pricing-rollout-overview.jpg",
    alt: "EMP billing workspace showing real subscription, invoice, and seat-management surfaces."
  },
  "contact-demo-overview": {
    src: "/screenshots/contact-demo-overview.jpg",
    alt: "EMP leave review workspace showing a real HR approval queue."
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
      className="surface relative overflow-hidden rounded-[2rem] p-4 sm:p-5"
      data-screenshot-slot={slotId}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_22%)]" />
      <div className="relative">
        <div className="flex items-center justify-between rounded-[1.35rem] border border-slate-200/80 bg-white/94 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Real product snapshot
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div className="overflow-hidden rounded-[1.65rem] border border-slate-200/80 bg-white/96 p-2 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
            {screenshot ? (
              <Image
                alt={screenshot.alt}
                className="h-auto w-full rounded-[1.15rem]"
                height={1000}
                priority={slotId === "homepage-platform-overview"}
                quality={92}
                sizes="(min-width: 1280px) 720px, (min-width: 1024px) 55vw, 100vw"
                src={screenshot.src}
                width={1600}
              />
            ) : null}
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            <div className="rounded-[1.55rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <p className="eyebrow">{eyebrow}</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50/90 p-4">
                  <p className="text-sm font-semibold text-slate-950">{sidebarTitle}</p>
                  <p className="mt-1 text-sm text-slate-500">{sidebarSubtitle}</p>
                </div>
                {sidebarItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-[1.35rem] border border-slate-200/80 bg-white/92 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

              <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/92 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{activityTitle}</p>
                    <p className="mt-1 text-sm text-slate-500">Captured from the live product</p>
                </div>
                  <span className="w-fit rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                    Product proof
                  </span>
                  </div>
                <div className="mt-5 grid gap-3">
                  {activityItems.map((item) => (
                    <div
                      key={item.title}
                      className="flex flex-col gap-3 rounded-[1.15rem] border border-slate-200 bg-slate-50/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-dashed border-slate-300 bg-white/72 px-5 py-4 text-sm leading-7 text-slate-600">
            <div>
              <p>{footerNote}</p>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Real dashboard captures from EMP
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
