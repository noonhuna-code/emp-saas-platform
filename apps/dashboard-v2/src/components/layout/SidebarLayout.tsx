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
    <div className={cn("navshell", mobileOpen && "navshell--mobile-open", collapsed && "navshell--collapsed")}>
      <header className="navshell__head">
        <div className={cn("navshell__brand", collapsed && "navshell__brand--collapsed")}>
          <div className="navshell__mark">E</div>
          {!collapsed ? (
            <div className="navshell__copy">
              <h2>{title}</h2>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="navshell__toggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </header>

      <div className={cn("navshell__body", collapsed && "navshell__body--collapsed")}>{children}</div>
    </div>
  );
};
