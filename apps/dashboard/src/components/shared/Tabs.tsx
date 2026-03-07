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
    <div className="tabs" role="tablist" aria-label="Dashboard views">
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={selected ? "tab tab--active" : "tab"}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
