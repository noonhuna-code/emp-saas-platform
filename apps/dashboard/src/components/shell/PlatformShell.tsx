"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export const PlatformShell = ({
  email,
  role,
  children
}: {
  email?: string | null;
  role?: string | null;
  children: ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((prev) => !prev);
  };

  const toggleMobile = () => {
    setMobileOpen((prev) => !prev);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const shellClassName = [
    "platform-shell",
    collapsed ? "platform-shell--collapsed" : "",
    mobileOpen ? "platform-shell--mobile-open" : ""
  ].join(" ").trim();

  return (
    <div className={shellClassName}>
      <aside className={`platform-sidebar ${collapsed ? "platform-sidebar--collapsed" : ""}`}>
        <div className="platform-sidebar__head">
          <button type="button" className="ghost-btn sidebar-toggle-mobile" onClick={toggleMobile} aria-label="Open platform menu">
            &#9776;
          </button>
          <button type="button" className="ghost-btn sidebar-toggle-desktop" onClick={toggleCollapsed} aria-label="Toggle platform sidebar">
            &#8942;
          </button>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="tag" style={{ width: "fit-content" }}>Platform Owner</span>
          {!collapsed ? (
            <>
              <strong className="platform-sidebar__title">Platform Operations</strong>
              <p className="muted" style={{ fontSize: 13 }}>
                Isolated shell for platform-level governance. Read-only cross-company summaries are permission-gated and audited.
              </p>
            </>
          ) : null}
        </div>

        <nav className="platform-sidebar__nav" aria-label="Platform navigation">
          <Link href="/platform" onClick={closeMobile}>Overview</Link>
          <Link href="/app/dashboard" onClick={closeMobile}>Tenant dashboard (restricted)</Link>
          <Link href="/app/monitoring" onClick={closeMobile}>Tenant monitoring (permission-gated)</Link>
        </nav>

        {!collapsed ? (
          <div className="card stack card--nested">
            <span className="muted" style={{ fontSize: 12 }}>Signed in</span>
            <strong>{email ?? "Authenticated user"}</strong>
            <span className="muted" style={{ fontSize: 12 }}>Role: {role ?? "Unknown"}</span>
          </div>
        ) : null}
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div className="row">
            <button type="button" className="ghost-btn sidebar-toggle-desktop" onClick={toggleCollapsed} aria-label="Toggle platform sidebar">
              &#8942;
            </button>
            <button type="button" className="ghost-btn sidebar-toggle-mobile" onClick={toggleMobile} aria-label="Open platform menu">
              &#9776;
            </button>
            <div className="stack" style={{ gap: 4 }}>
              <strong>Platform Owner Shell</strong>
              <span className="muted" style={{ fontSize: 13 }}>
                Separate from tenant app shell to avoid accidental company-scope access patterns.
              </span>
            </div>
          </div>
          <div className="row">
            <ThemeToggle />
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="secondary-btn">Logout</button>
            </form>
          </div>
        </header>
        <main className="page-wrap stack">{children}</main>
      </div>
      {mobileOpen ? <button type="button" className="shell-backdrop" aria-label="Close platform menu" onClick={closeMobile} /> : null}
    </div>
  );
};
