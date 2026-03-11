export type TabItem = {
  id: string;
  label: string;
};

export const Tabs = ({
  tabs,
  active,
  onChange
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
}) => {
  return (
    <div
      className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white/85 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
      role="tablist"
      aria-label="Dashboard views"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected
              ? "rounded-full bg-slate-950 px-5 py-2 text-sm font-semibold text-white shadow-sm dark:bg-white dark:text-slate-950"
              : "rounded-full px-5 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
            }
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
