import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeaderBar = ({
  title,
  subtitle,
  leading,
  compact = false,
  onToggleMobileSidebar,
  actions
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  compact?: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  actions?: ReactNode;
}) => {
  return (
    <header className="header-bar" data-compact={compact ? "true" : "false"}>
      <div className="header-bar__left">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="header-bar__toggle-mobile md:hidden"
          onClick={onToggleMobileSidebar}
          aria-label="Open menu"
        >
          <Menu size={16} />
        </Button>
        {leading ? <div className="header-bar__leading">{leading}</div> : null}
        <div className="header-bar__title-wrap">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="header-bar__actions">{actions}</div>
    </header>
  );
};
