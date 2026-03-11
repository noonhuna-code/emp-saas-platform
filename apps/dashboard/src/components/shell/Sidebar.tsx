"use client";

import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { NavSection } from "@/components/shell/NavSection";
import {
  TENANT_NAVIGATION_GROUPS,
  resolveVisibleNavigationGroups
} from "@/navigation/navigation.config";

export const Sidebar = ({
  permissions,
  hasEmployeeContext,
  entitlements,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile
}: {
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) => {
  const visibleGroups = resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, {
    permissions,
    hasEmployeeContext,
    entitlements
  });

  return (
    <aside className={`ui-sidebar ${collapsed ? "ui-sidebar--collapsed" : ""} ${mobileOpen ? "ui-sidebar--open" : ""}`}>
      <SidebarLayout
        title="EMP OS"
        subtitle="Workforce operating system"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={onToggleCollapsed}
      >
        <NavSection groups={visibleGroups} collapsed={collapsed} onNavigate={onCloseMobile} />
      </SidebarLayout>
    </aside>
  );
};



