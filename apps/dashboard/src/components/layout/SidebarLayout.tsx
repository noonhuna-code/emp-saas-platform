import type { ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    <div className={cn("control-sidebar", mobileOpen && "control-sidebar--mobile-open", collapsed && "control-sidebar--collapsed")}>
      <header className="control-sidebar__header">
        <div className={cn("control-sidebar__brand", collapsed && "control-sidebar__brand--collapsed")}>
          <div className="control-sidebar__logo">EO</div>
          {!collapsed ? (
            <div className="control-sidebar__brand-copy">
              <h2>{title}</h2>
              {subtitle ? <span>{subtitle}</span> : null}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="control-sidebar__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </header>

      <div className={cn("control-sidebar__body", collapsed && "control-sidebar__body--collapsed")}>{children}</div>
    </div>
  );
};
