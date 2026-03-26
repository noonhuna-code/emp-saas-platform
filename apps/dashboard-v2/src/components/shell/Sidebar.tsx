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
        "fixed inset-y-0 left-0 z-40 isolate flex shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#061121_0%,#081528_42%,#050c18_100%)] text-white shadow-[20px_0_48px_rgba(2,6,23,0.34)] transition-transform duration-200 lg:static lg:translate-x-0",
        collapsed ? "w-24 lg:w-24" : "w-[286px] lg:w-[286px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_18%_10%,rgba(56,189,248,0.2),transparent_58%)]" />
        <div className="absolute inset-x-0 top-10 h-52 bg-[radial-gradient(circle_at_78%_0%,rgba(14,165,233,0.12),transparent_48%)]" />
        <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:linear-gradient(180deg,black,transparent_58%)]" />
      </div>

      <div className="relative z-10 border-b border-white/8 bg-white/[0.02] px-4 py-4 backdrop-blur-sm">
        <div className={cn("flex items-start justify-between gap-3", collapsed && "justify-center") }>
          <div className={cn("flex items-start", collapsed ? "justify-center" : "gap-3") }>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.2rem] border border-white/12 bg-white/[0.05] p-1 shadow-[0_18px_40px_rgba(2,6,23,0.3)] ring-1 ring-white/6">
              <div className="flex h-full w-full items-center justify-center rounded-[0.95rem] bg-[linear-gradient(145deg,rgba(56,189,248,0.92),rgba(37,99,235,0.74))] text-base font-semibold tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                E
              </div>
            </div>
            {!collapsed ? (
              <div className="min-w-0 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-200/65">{PERSONA_LABELS[persona]}</div>
                <div className="text-[1.7rem] font-semibold tracking-[-0.04em] text-white">EMP OS V2</div>
                <div className="max-w-[170px] text-sm leading-5 text-slate-300/78">
                  Workforce operations shell for approvals, people, payroll, and oversight.
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-sky-300/20 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {!collapsed ? (
          <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl border border-sky-300/18 bg-sky-400/10 text-sky-200">
                <Sparkles className="h-4 w-4" />
              </span>
              Premium workforce command surface
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300/72">
              One shell for people, approvals, schedules, communication, and analytics.
            </p>
          </div>
        ) : null}
      </div>

      <div className="dashboard-v2-sidebar__scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <NavSection groups={groups} collapsed={collapsed} onNavigate={onCloseMobile} />
      </div>
    </aside>
  );
};
