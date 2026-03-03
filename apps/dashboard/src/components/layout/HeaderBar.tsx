import type { ReactNode } from "react";
import { Menu, PanelLeftClose } from "lucide-react";
import { Button } from "@/components/ui/button";

export const HeaderBar = ({
  title,
  subtitle,
  onToggleSidebar,
  onToggleMobileSidebar,
  actions
}: {
  title: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  actions?: ReactNode;
}) => {
  return (
    <header className="header-bar">
      <div className="header-bar__left">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="header-bar__toggle-desktop"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelLeftClose size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="header-bar__toggle-mobile"
          onClick={onToggleMobileSidebar}
          aria-label="Open menu"
        >
          <Menu size={16} />
        </Button>
        <div className="header-bar__title-wrap">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="header-bar__actions">{actions}</div>
    </header>
  );
};
