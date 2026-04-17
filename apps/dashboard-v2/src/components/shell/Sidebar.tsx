"use client";

import {
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { NavSection } from "@/components/shell/NavSection";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import { cn } from "@/lib/utils";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups } from "@/navigation/navigation.config";

export const SIDEBAR_COLLAPSED_WIDTH = "6.5rem";
export const SIDEBAR_EXPANDED_WIDTH = "20.5rem";

const SHARED_SIDEBAR_BACKGROUND =
  "bg-white dark:bg-gray-900";

const PERSONA_LABELS: Record<DashboardPersona, string> = {
  employee: "Employee workspace",
  manager: "Manager command",
  admin_ops: "Operations control",
  finance: "Finance workspace",
  executive: "Executive workspace",
  platform_owner: "Platform oversight"
};

const SidebarBrand = ({
  collapsed,
  persona,
  onToggleCollapsed
}: {
  collapsed: boolean;
  persona: DashboardPersona;
  onToggleCollapsed: () => void;
}) => (
  <div className={cn("border-b border-gray-200 dark:border-gray-800", collapsed ? "px-3 pb-4 pt-4" : "px-4 pb-4 pt-4")}>
    {collapsed ? (
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-brand-500 text-sm font-semibold tracking-[0.18em] text-white shadow-theme-md dark:border-gray-800 dark:bg-brand-500">
          EMP
        </div>
        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex min-h-7 items-center rounded-full bg-brand-50 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            {PERSONA_LABELS[persona]}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-brand-500 text-sm font-semibold tracking-[0.18em] text-white shadow-theme-md dark:border-gray-800 dark:bg-brand-500">
              EMP
            </div>

            <div className="min-w-0">
              <div className="truncate text-[1.5rem] font-semibold tracking-[-0.06em] text-gray-900 dark:text-white/90">EMP Workforce OS</div>
              <div className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">Role-aware TailAdmin workspace</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>
    )}
  </div>
);

export const Sidebar = ({
  permissions,
  hasEmployeeContext,
  entitlements,
  persona,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile
}: {
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
  persona: DashboardPersona;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) => {
  const groups = resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, {
    permissions,
    hasEmployeeContext,
    entitlements,
    persona
  });

  return (
    <aside
      className={cn(
        `fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-gray-200 ${SHARED_SIDEBAR_BACKGROUND} text-gray-900 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_12px_24px_rgba(16,24,40,0.08)] transition-transform duration-200 dark:border-gray-800 dark:text-white/90 lg:relative lg:inset-auto lg:z-20 lg:h-dvh lg:w-[var(--emp-sidebar-width)] lg:min-w-[var(--emp-sidebar-width)] lg:translate-x-0`,
        collapsed ? "w-[6.5rem]" : "w-[328px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <SidebarBrand collapsed={collapsed} persona={persona} onToggleCollapsed={onToggleCollapsed} />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="emp-shell-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain px-3 pb-4 pt-5">
          <div className="space-y-4">
            <NavSection groups={groups} collapsed={collapsed} onNavigate={onCloseMobile} />
          </div>
        </div>
      </div>

    </aside>
  );
};
