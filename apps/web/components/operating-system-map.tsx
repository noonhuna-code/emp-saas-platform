import type { ArchitectureLayer } from "@/lib/content";

type OperatingSystemMapProps = {
  eyebrow?: string;
  title: string;
  description: string;
  layers: readonly ArchitectureLayer[];
};

export function OperatingSystemMap({
  eyebrow = "Operating model",
  title,
  description,
  layers
}: OperatingSystemMapProps) {
  return (
    <section className="section">
      <div className="container">
        <div className="rounded-[2.2rem] border border-slate-200/80 bg-white/88 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.07)] sm:p-8">
          <div className="max-w-3xl">
            <p className="eyebrow">{eyebrow}</p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">{description}</p>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start">
            <div className="rounded-[1.8rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                How the system behaves
              </p>
              <div className="mt-5 grid gap-4">
                {[
                  "Start with the real company structure and ownership model.",
                  "Run approvals and workforce workflows where the right people can act.",
                  "Keep payroll visibility, leadership reporting, and audit review tied back to the same source of truth."
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {layers.map((layer, index) => (
                <article
                  key={layer.title}
                  className="relative rounded-[1.8rem] border border-slate-200 bg-slate-50/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
                      0{index + 1}
                    </p>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {layer.title}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">
                    {layer.summary}
                  </h3>
                  <div className="mt-5 grid gap-3">
                    {layer.points.map((point) => (
                      <div
                        key={point}
                        className="rounded-[1.15rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-600"
                      >
                        {point}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
