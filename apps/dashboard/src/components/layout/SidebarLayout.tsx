import type { ReactNode } from "react";

export const SidebarLayout = ({
  title,
  subtitle,
  collapsed,
  mobileOpen,
  children
}: {
  title: string;
  subtitle?: string;
  collapsed?: boolean;
  mobileOpen?: boolean;
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
      </header>
      <div className="sidebar-layout__body">{children}</div>
    </div>
  );
};
