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
  <div className={cn("border-b border-white/8", collapsed ? "px-3 pb-4 pt-4" : "px-4 pb-4 pt-4")}>
    {collapsed ? (
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.88),rgba(56,189,248,0.58))] text-sm font-semibold tracking-[0.18em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)]">
          EMP
        </div>
        <button
          type="button"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
          onClick={onToggleCollapsed}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-3">
          <div className="inline-flex min-h-7 items-center rounded-full border border-sky-300/18 bg-sky-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-100/82">
            {PERSONA_LABELS[persona]}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.88),rgba(56,189,248,0.58))] text-sm font-semibold tracking-[0.18em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)]">
              EMP
            </div>

            <div className="min-w-0">
              <div className="text-[1.7rem] font-semibold tracking-[-0.08em] text-white">EMP OS V2</div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
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
        "fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-sky-300/10 bg-[radial-gradient(circle_at_12%_8%,rgba(96,165,250,0.28),transparent_16%),radial-gradient(circle_at_18%_28%,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_22%_78%,rgba(37,99,235,0.18),transparent_28%),linear-gradient(180deg,#040916_0%,#081224_44%,#0b1730_100%)] text-white shadow-[20px_0_50px_rgba(2,6,23,0.24)] transition-transform duration-200 lg:relative lg:inset-auto lg:z-20 lg:h-dvh lg:w-[var(--emp-sidebar-width)] lg:min-w-[var(--emp-sidebar-width)] lg:translate-x-0",
        collapsed ? "w-[6.5rem]" : "w-[328px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_18%,transparent_72%,rgba(2,6,23,0.2)_100%),radial-gradient(circle_at_left_center,rgba(14,165,233,0.1),transparent_34%)]"
      />
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
