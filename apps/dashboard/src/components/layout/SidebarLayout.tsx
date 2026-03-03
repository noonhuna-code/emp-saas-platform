import type { ReactNode } from "react";

export const SidebarLayout = ({
  title,
  subtitle,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  children
}: {
  title: string;
  subtitle?: string;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggleCollapsed?: () => void;
  children: ReactNode;
}) => {
  return (
    <div
      className={[
        "sidebar-layout",
        collapsed ? "sidebar-layout--collapsed" : "",
        mobileOpen ? "sidebar-layout--mobile-open" : ""
      ].join(" ").trim()}
    >
      <header className="sidebar-layout__head">
        <div className="sidebar-layout__brand">
          <h2>{collapsed ? title.slice(0, 3) : title}</h2>
          {!collapsed && subtitle ? <p>{subtitle}</p> : null}
        </div>
        <button
          type="button"
          className="ghost-btn sidebar-layout__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </header>
      <div className="sidebar-layout__body">{children}</div>
    </div>
  );
};
