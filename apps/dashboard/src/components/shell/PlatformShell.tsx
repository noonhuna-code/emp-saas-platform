"use client";

import { useState, type ReactNode } from "react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { NavSection } from "@/components/shell/NavSection";
import { CommandPalette } from "@/components/shell/CommandPalette";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import type { NavigationGroup } from "@/navigation/navigation.config";
import { PLATFORM_NAVIGATION_ITEMS } from "@/navigation/navigation.config";

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
  const platformGroups: NavigationGroup[] = [
    {
      id: "platform",
      label: "Platform",
      items: PLATFORM_NAVIGATION_ITEMS
    }
  ];

  return (
    <>
      <DashboardLayout
        shellClassName={`enterprise-shell-v8 platform-shell ${collapsed ? "platform-shell--collapsed" : ""} ${mobileOpen ? "platform-shell--mobile-open" : ""}`}
        sidebar={(
          <aside className={`platform-sidebar ${collapsed ? "platform-sidebar--collapsed" : ""} ${mobileOpen ? "platform-sidebar--open" : ""}`}>
            <SidebarLayout
              title="Platform"
              subtitle="Owner Console"
              collapsed={collapsed}
              mobileOpen={mobileOpen}
              onToggleCollapsed={() => setCollapsed((prev) => !prev)}
            >
              <NavSection groups={platformGroups} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
              {!collapsed ? (
                <div className="section-container section-container--soft">
                  <div className="section-container__body">
                    <p className="muted">Signed in</p>
                    <strong>{email ?? "Authenticated user"}</strong>
                    <p className="muted">Role: {role ?? "Unknown"}</p>
                  </div>
                </div>
              ) : null}
            </SidebarLayout>
          </aside>
        )}
        header={(
          <HeaderBar
            title="Platform Owner Shell"
            subtitle="Global governance and billing oversight"
            onToggleSidebar={() => setCollapsed((prev) => !prev)}
            onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
            actions={(
              <>
                <ThemeToggle />
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="secondary-btn">Logout</button>
                </form>
              </>
            )}
          />
        )}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      >
        <div className="page-wrap">{children}</div>
      </DashboardLayout>
      <CommandPalette persona={"platform_owner" as DashboardPersona} />
    </>
  );
};
