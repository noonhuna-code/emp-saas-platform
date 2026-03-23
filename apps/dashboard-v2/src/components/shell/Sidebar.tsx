"use client";

import { PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { NavSection } from "@/components/shell/NavSection";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import { cn } from "@/lib/utils";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups } from "@/navigation/navigation.config";

const PERSONA_LABELS: Record<DashboardPersona, string> = {
  employee: "Employee workspace",
  team_lead: "Team lead desk",
  manager: "Manager desk",
  hr: "HR operations",
  finance: "Finance workspace",
  it: "IT operations",
  admin: "Administration",
  founder: "Executive workspace",
  platform_owner: "Platform oversight"
};

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
        "fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col border-r border-slate-900/80 bg-[linear-gradient(180deg,#081427_0%,#07111f_48%,#050d18_100%)] text-white transition-transform duration-200 lg:static lg:translate-x-0",
        collapsed ? "w-24 lg:w-24" : "w-[286px] lg:w-[286px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="border-b border-white/8 px-4 py-4">
        <div className={cn("flex items-start justify-between gap-3", collapsed && "justify-center")}>
          <div className={cn("flex items-start", collapsed ? "justify-center" : "gap-3")}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-base font-semibold text-white shadow-[0_12px_28px_rgba(37,99,235,0.34)]">
              E
            </div>
            {!collapsed ? (
              <div className="min-w-0 space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300/70">{PERSONA_LABELS[persona]}</div>
                <div className="text-2xl font-semibold tracking-tight text-white">EMP OS V2</div>
                <div className="text-sm leading-5 text-slate-400">Premium workforce operating system</div>
              </div>
            ) : null}
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

        {!collapsed ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4 text-sky-300" />
                Premium workforce command surface
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                One shell for people, approvals, schedules, communication, and analytics.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300/70">Workspace posture</div>
              <div className="mt-3 grid gap-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
                  Role-aware navigation
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
                  Scoped org reads ready
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
                  Action-first dashboards
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <NavSection groups={groups} collapsed={collapsed} onNavigate={onCloseMobile} />
      </div>

      {!collapsed ? (
        <div className="border-t border-white/8 px-4 py-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300/70">Navigation quality</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This shell keeps queues, oversight, organization, and execution surfaces in one calmer lane instead of scattering them across unrelated screens.
            </p>
          </div>
        </div>
      ) : null}
    </aside>
  );
};
