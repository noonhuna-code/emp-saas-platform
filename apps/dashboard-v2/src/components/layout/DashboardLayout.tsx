import type { ReactNode } from "react";

export const DashboardLayout = ({
  shellClassName,
  sidebar,
  header,
  children,
  mobileOpen,
  onCloseMobile
}: {
  shellClassName?: string;
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) => {
  return (
    <div className={["ui-shell", shellClassName ?? ""].join(" ").trim()}>
      {sidebar}
      <div className="ui-shell__content">
        <div className="ui-shell__topbar">{header}</div>
        <main className="ui-shell__main" onClick={() => (mobileOpen && onCloseMobile ? onCloseMobile() : undefined)}>
          {children}
        </main>
      </div>
      {mobileOpen ? (
        <button
          type="button"
          className="ui-shell__backdrop"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      ) : null}
    </div>
  );
};

