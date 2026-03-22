import type { IntegrationCategory } from "@/lib/content";

type IntegrationGridProps = {
  categories: readonly IntegrationCategory[];
};

export function IntegrationGrid({ categories }: IntegrationGridProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {categories.map((category) => (
        <article
          key={category.title}
          className="surface rounded-[1.75rem] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)]"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">
            {category.title}
          </p>
          <p className="mt-4 text-base leading-7 text-slate-600">{category.summary}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {category.items.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Outcome
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{category.outcome}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
