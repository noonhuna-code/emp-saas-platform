"use client";

import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { NavSection } from "@/components/shell/NavSection";
import {
  TENANT_NAVIGATION_ITEMS,
  resolveVisibleNavigationItems
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
  const visibleItems = resolveVisibleNavigationItems(TENANT_NAVIGATION_ITEMS, {
    permissions,
    hasEmployeeContext,
    entitlements
  });

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${mobileOpen ? "sidebar--open" : ""}`}>
      <SidebarLayout
        title="EMP OS"
        subtitle="Enterprise Suite"
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={onToggleCollapsed}
      >
        <NavSection items={visibleItems} collapsed={collapsed} onNavigate={onCloseMobile} />
      </SidebarLayout>
    </aside>
  );
};
