"use client";

import { useState, type ReactNode } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { NavSection } from "@/components/shell/NavSection";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { Topbar } from "@/components/shell/Topbar";
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
        shellClassName={`ui-shell--platform ${collapsed ? "ui-shell--collapsed" : ""} ${mobileOpen ? "ui-shell--mobile-open" : ""}`.trim()}
        sidebar={(
          <aside className={`ui-sidebar ui-sidebar--platform ${collapsed ? "ui-sidebar--collapsed" : ""} ${mobileOpen ? "ui-sidebar--open" : ""}`}>
            <SidebarLayout
              title="Platform"
              subtitle="Governance console"
              collapsed={collapsed}
              mobileOpen={mobileOpen}
              onToggleCollapsed={() => setCollapsed((prev) => !prev)}
            >
              <NavSection groups={platformGroups} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
            </SidebarLayout>
          </aside>
        )}
        header={(
          <Topbar
            persona={"platform_owner" as DashboardPersona}
            role={role ?? "platform_owner"}
            companyId={null}
            email={email}
            fullName={email ?? "Platform Owner"}
            billingContext={null}
            onToggleSidebar={() => setCollapsed((prev) => !prev)}
            onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
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









