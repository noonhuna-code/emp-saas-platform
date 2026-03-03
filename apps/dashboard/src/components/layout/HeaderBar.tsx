import type { ReactNode } from "react";

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
        <button type="button" className="ghost-btn header-bar__toggle-desktop" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          ...
        </button>
        <button type="button" className="ghost-btn header-bar__toggle-mobile" onClick={onToggleMobileSidebar} aria-label="Open menu">
          Menu
        </button>
        <div className="header-bar__title-wrap">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="header-bar__actions">{actions}</div>
    </header>
  );
};
