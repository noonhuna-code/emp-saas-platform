import type { ReactNode } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="sidebar-layout__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronsRight size={14} /> : <ChevronsLeft size={14} />}
        </Button>
      </header>
      <div className="sidebar-layout__body">{children}</div>
    </div>
  );
};
