import type { ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      ]
        .join(" ")
        .trim()}
    >
      <header className="sidebar-layout__head">
        <div className="sidebar-layout__brand-wrap">
          <Badge variant="info" className="sidebar-layout__workspace-badge">
            <Sparkles className="h-3.5 w-3.5" />
            {!collapsed ? <span>Workspace</span> : null}
          </Badge>
          <div className="sidebar-layout__brand">
            <h2>{collapsed ? title.slice(0, 3) : title}</h2>
            {!collapsed && subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="sidebar-layout__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </header>
      <div className="sidebar-layout__body">{children}</div>
    </div>
  );
};
