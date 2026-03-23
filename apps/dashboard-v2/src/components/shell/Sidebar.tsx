"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Command,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sparkles,
  Waves
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
  employee: "Self-service, records, workday, and collaboration in one calm lane.",
  team_lead: "Approvals, team coverage, and frontline execution without menu sprawl.",
  manager: "People, operations, and delivery signals organized around team decisions.",
  hr: "People operations, compliance, and lifecycle work with cleaner control lanes.",
  finance: "Payroll, billing, and finance workflow visibility without losing context.",
  it: "Operational reliability, system oversight, and support readiness in one shell.",
  admin: "Company control, governance, and workflow surfaces grouped by real operations.",
  founder: "Strategic visibility, executive posture, and enterprise control with less noise.",
  platform_owner: "Cross-tenant governance, posture, and platform-level visibility."
};

const PERSONA_POSTURE: Record<DashboardPersona, string[]> = {
  employee: ["Personal workspace", "Full workday coverage", "Self-service ready"],
  team_lead: ["Team execution", "Queue visibility", "Org read ready"],
  manager: ["Team operations", "People context", "Approval coverage"],
  hr: ["People control", "Lifecycle coverage", "Org read ready"],
  finance: ["Payroll visibility", "Billing context", "Control ready"],
  it: ["System visibility", "Security signals", "Support coverage"],
  admin: ["Operational control", "Governance context", "Cross-module coverage"],
  founder: ["Executive summary", "Calm oversight", "Strategic signal lane"],
  platform_owner: ["Platform scope", "Global controls", "Governance ready"]
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
          <div className="inline-flex min-h-8 items-center rounded-full border border-sky-300/18 bg-sky-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-100/82">
            {PERSONA_LABELS[persona]}
          </div>
        ) : null}

        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.88),rgba(56,189,248,0.58))] text-sm font-semibold tracking-[0.18em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)]">
            EMP
          </div>

          {!collapsed ? (
            <div className="min-w-0 space-y-1">
              <div className="text-[1.72rem] font-semibold tracking-[-0.08em] text-white">EMP OS V2</div>
              <div className="max-w-[16rem] text-sm leading-6 text-slate-400">{PERSONA_SUMMARY[persona]}</div>
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

const SidebarPosture = ({
  collapsed,
  persona
}: {
  collapsed: boolean;
  persona: DashboardPersona;
}) => {
  if (collapsed) return null;

  const posture = PERSONA_POSTURE[persona];

  return (
    <section className="space-y-3 rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/55">
        <Waves className="h-4 w-4 text-sky-300/80" />
        Workspace posture
      </div>

      <div className="grid gap-2">
        {posture.map((entry) => (
          <div
            key={entry}
            className="rounded-2xl border border-white/8 bg-white/[0.045] px-3 py-3 text-sm font-medium text-slate-200"
          >
            {entry}
          </div>
        ))}
      </div>
    </section>
  );
};

const SidebarFooter = ({ collapsed }: { collapsed: boolean }) => {
  if (collapsed) return null;

  return (
    <div className="border-t border-white/8 px-4 py-4">
      <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/55">
          <Sparkles className="h-4 w-4 text-sky-300/85" />
          Shell quality
        </div>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          Built to keep modules, approvals, people, execution, and support context in one calmer operating system.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-slate-300">
            <Command className="mr-1.5 h-3.5 w-3.5 text-sky-300/85" />
            Route-aware
          </span>
          <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.045] px-3 py-1.5 text-[11px] font-medium text-slate-300">
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-sky-300/85" />
            Scoped access
          </span>
          <Link
            href="https://emp-saas-platform.vercel.app/sign-in"
            className="inline-flex items-center rounded-full border border-sky-300/15 bg-sky-400/10 px-3 py-1.5 text-[11px] font-medium text-sky-100 transition hover:border-sky-300/25 hover:bg-sky-400/14"
          >
            Public sign in
            <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
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
        "fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-sky-300/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(180deg,#050b18_0%,#081224_48%,#0b1730_100%)] text-white shadow-[20px_0_50px_rgba(2,6,23,0.24)] transition-transform duration-200 lg:sticky lg:top-0 lg:z-20 lg:translate-x-0",
        collapsed ? "w-24 lg:w-24" : "w-[302px] lg:w-[302px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <SidebarBrand collapsed={collapsed} persona={persona} onToggleCollapsed={onToggleCollapsed} />

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="emp-shell-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain px-3 py-4">
          <div className="space-y-5">
            <SidebarPosture collapsed={collapsed} persona={persona} />

            {!collapsed ? (
              <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100/55">
                  <Compass className="h-4 w-4 text-sky-300/80" />
                  Navigation model
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Shared core routes stay stable while each role gets fuller, safer coverage for the modules that matter.
                </p>
              </div>
            ) : null}

            <NavSection groups={groups} collapsed={collapsed} onNavigate={onCloseMobile} />
          </div>
        </div>
      </div>

      <SidebarFooter collapsed={collapsed} />
    </aside>
  );
};
