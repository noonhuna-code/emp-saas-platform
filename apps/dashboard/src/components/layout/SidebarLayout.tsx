import type { ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  const initials =
    title
      .split(" ")
      .map((segment) => segment[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "EO";

  return (
    <div
      className={[
        "ui-nav-shell",
        collapsed ? "ui-nav-shell--collapsed" : "",
        mobileOpen ? "ui-nav-shell--mobile-open" : ""
      ]
        .join(" ")
        .trim()}
    >
      <header className="ui-nav-shell__head">
        <div className="ui-nav-shell__brand-row">
          <div className="ui-nav-shell__brand">
            <div className="ui-nav-shell__brandmark" aria-hidden="true">
              {initials.slice(0, 1)}
            </div>
            {!collapsed ? (
              <div className="ui-nav-shell__copy">
                <span className="ui-nav-shell__product">{title}</span>
                {subtitle ? <p className="ui-nav-shell__subtitle">{subtitle}</p> : null}
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ui-nav-shell__toggle"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        {!collapsed ? <span className="ui-nav-shell__eyebrow">Enterprise workforce platform</span> : null}
      </header>

      <div className="ui-nav-shell__body">{children}</div>
    </div>
  );
};
