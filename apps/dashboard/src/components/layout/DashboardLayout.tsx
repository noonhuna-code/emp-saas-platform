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
    <div className={["dashboard-layout", shellClassName ?? ""].join(" ").trim()}>
      {sidebar}
      <div className="dashboard-layout__content">
        {header}
        <main className="dashboard-layout__main" onClick={() => (mobileOpen && onCloseMobile ? onCloseMobile() : undefined)}>
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
