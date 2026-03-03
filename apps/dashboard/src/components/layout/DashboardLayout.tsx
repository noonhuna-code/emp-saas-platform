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
    <div className={["dashboard-layout", "app-shell", shellClassName ?? ""].join(" ").trim()}>
      {sidebar}
      <div className="dashboard-layout__content main-column">
        <div className="topbar-row">{header}</div>
        <main className="dashboard-layout__main content-area" onClick={() => (mobileOpen && onCloseMobile ? onCloseMobile() : undefined)}>
          {children}
        </main>
      </div>
      {mobileOpen ? (
        <button
          type="button"
          className="shell-backdrop"
          aria-label="Close menu"
          onClick={onCloseMobile}
        />
      ) : null}
    </div>
  );
};
