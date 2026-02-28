import type { ReactNode } from "react";
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
  return (
    <div className="platform-shell">
      <aside className="platform-sidebar">
        <div className="stack" style={{ gap: 6 }}>
          <span className="tag" style={{ width: "fit-content" }}>Platform Owner</span>
          <strong className="platform-sidebar__title">Platform Operations</strong>
          <p className="muted" style={{ fontSize: 13 }}>
            Isolated shell for platform-level governance. Read-only cross-company summaries are permission-gated and audited.
          </p>
        </div>

        <nav className="platform-sidebar__nav" aria-label="Platform navigation">
          <Link href="/platform">Overview</Link>
          <Link href="/app/dashboard">Tenant dashboard (restricted)</Link>
          <Link href="/app/monitoring">Tenant monitoring (permission-gated)</Link>
        </nav>

        <div className="card stack card--nested">
          <span className="muted" style={{ fontSize: 12 }}>Signed in</span>
          <strong>{email ?? "Authenticated user"}</strong>
          <span className="muted" style={{ fontSize: 12 }}>Role: {role ?? "Unknown"}</span>
        </div>
      </aside>

      <div className="platform-main">
        <header className="platform-topbar">
          <div className="stack" style={{ gap: 4 }}>
            <strong>Platform Owner Shell</strong>
            <span className="muted" style={{ fontSize: 13 }}>
              Separate from tenant app shell to avoid accidental company-scope access patterns.
            </span>
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
    </div>
  );
};
