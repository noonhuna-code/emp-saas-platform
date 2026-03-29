export type TabItem = {
  id: string;
  label: string;
};

export const Tabs = ({
  tabs,
  active,
  onChange,
  noWrap = false,
  variant = "default",
}: {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  noWrap?: boolean;
  variant?: "default" | "soft";
}) => {
  return (
    <div className="max-w-full overflow-x-auto pb-1">
      <div
        className={[
          "inline-flex min-w-max items-center gap-1 rounded-[18px] border border-slate-200 bg-white/90 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950/70",
          noWrap ? "flex-nowrap whitespace-nowrap" : "flex-wrap",
        ].join(" ")}
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
              className={
                variant === "soft"
                  ? selected
                    ? "rounded-[14px] bg-white px-5 py-2 text-sm font-semibold text-slate-950 shadow-[0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-sky-500/15 dark:bg-slate-950 dark:text-slate-50 dark:ring-sky-400/20"
                    : "rounded-[14px] px-5 py-2 text-sm font-medium text-slate-500 transition hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                  : selected
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
    </div>
  );
};
