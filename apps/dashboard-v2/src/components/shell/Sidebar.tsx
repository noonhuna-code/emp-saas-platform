"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles
} from "lucide-react";
import { NavSection } from "@/components/shell/NavSection";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import { cn } from "@/lib/utils";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups } from "@/navigation/navigation.config";

const PERSONA_LABELS: Record<DashboardPersona, string> = {
  employee: "Employee workspace",
  team_lead: "Team lead desk",
  manager: "Manager command",
  hr: "HR operations",
  finance: "Finance workspace",
  it: "IT operations",
  admin: "Administration",
  founder: "Executive workspace",
  platform_owner: "Platform oversight"
};

const PERSONA_SUMMARY: Record<DashboardPersona, string> = {
  employee: "Personal workspace",
  team_lead: "Team lead workspace",
  manager: "Manager workspace",
  hr: "HR workspace",
  finance: "Finance workspace",
  it: "IT workspace",
  admin: "Admin workspace",
  founder: "Executive workspace",
  platform_owner: "Platform workspace"
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
  <div className="border-b border-white/8 px-4 pb-4 pt-4">
    <div className={cn("flex items-start justify-between gap-3", collapsed && "justify-center")}>
      <div className={cn("min-w-0", collapsed ? "flex justify-center" : "space-y-4")}>
        {!collapsed ? (
          <div className="inline-flex min-h-7 items-center rounded-full border border-sky-300/18 bg-sky-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-100/82">
            {PERSONA_LABELS[persona]}
          </div>
        ) : null}

        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.88),rgba(56,189,248,0.58))] text-sm font-semibold tracking-[0.18em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)]">
            EMP
          </div>

          {!collapsed ? (
            <div className="min-w-0 space-y-1">
              <div className="text-[1.7rem] font-semibold tracking-[-0.08em] text-white">EMP OS V2</div>
              <div className="max-w-[16rem] text-[13px] leading-5 text-slate-400">{PERSONA_SUMMARY[persona]}</div>
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </div>
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
        "fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-sky-300/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(180deg,#050b18_0%,#081224_48%,#0b1730_100%)] text-white shadow-[20px_0_50px_rgba(2,6,23,0.24)] transition-transform duration-200 lg:relative lg:inset-auto lg:z-20 lg:h-dvh lg:w-[var(--emp-sidebar-width)] lg:min-w-[var(--emp-sidebar-width)] lg:translate-x-0",
        collapsed ? "w-24" : "w-[328px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <SidebarBrand collapsed={collapsed} persona={persona} onToggleCollapsed={onToggleCollapsed} />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="emp-shell-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="space-y-4">
            {!collapsed ? (
              <div className="flex items-center gap-2 rounded-[1.25rem] border border-white/8 bg-white/[0.035] px-3 py-2.5 text-[11px] font-medium text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-sky-300/85" />
                Current role: {PERSONA_SUMMARY[persona]}
              </div>
            ) : null}
            <NavSection groups={groups} collapsed={collapsed} onNavigate={onCloseMobile} />
          </div>
        </div>
      </div>
    </aside>
  );
};
