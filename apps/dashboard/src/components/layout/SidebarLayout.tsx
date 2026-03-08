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
  const initials = title
    .split(" ")
    .map((segment) => segment[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "EO";

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
        <div className="sidebar-layout__utility-row">
          <Badge variant="info" className="sidebar-layout__workspace-badge">
            <Sparkles className="h-3.5 w-3.5" />
            {!collapsed ? <span>Operations OS</span> : null}
          </Badge>
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
        </div>
        <div className="sidebar-layout__brand-wrap">
          <div className="sidebar-layout__brand-mark" aria-hidden="true">
            <span>{collapsed ? initials.slice(0, 1) : initials}</span>
          </div>
          {!collapsed ? (
            <div className="sidebar-layout__brand">
              <span className="sidebar-layout__overline">Enterprise command system</span>
              <h2>{title}</h2>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          ) : null}
        </div>
      </header>
      <div className="sidebar-layout__body">{children}</div>
    </div>
  );
};
