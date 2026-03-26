"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { NavSection } from "@/components/shell/NavSection";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { Topbar } from "@/components/shell/Topbar";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import type { NavigationGroup } from "@/navigation/navigation.config";
import { cn } from "@/lib/utils";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from "./Sidebar";

const PLATFORM_NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: "platform-home",
    label: "Platform command",
    description: "Global posture, commercial health, and cross-tenant oversight",
    items: [
      {
        href: "/platform",
        label: "Overview",
        icon: "home",
        description: "Global oversight and platform posture"
      },
      {
        href: "/app/monitoring",
        label: "Monitoring",
        icon: "monitoring",
        description: "Security, reliability, and system signals"
      },
      {
        href: "/app/billing",
        label: "Billing",
        icon: "billing",
        description: "Subscriptions, entitlements, and tenant health"
      },
      {
        href: "/app/settings",
        label: "Settings",
        icon: "settings",
        description: "Platform preferences and controls"
      }
    ]
  }
];

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
  const shellStyle = {
    "--emp-sidebar-width": collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
  } as CSSProperties;

  return (
    <>
      <div
        style={shellStyle}
        className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#f8fbff_0%,#eef4ff_42%,#e7eef9_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,#081325_0%,#050b16_42%,#02050b_100%)] dark:text-slate-50"
      >
        <div className="flex h-dvh overflow-hidden lg:grid lg:grid-cols-[var(--emp-sidebar-width)_minmax(0,1fr)]">
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-sky-300/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.14),transparent_32%),linear-gradient(180deg,#050b18_0%,#081224_48%,#0b1730_100%)] text-white shadow-[20px_0_50px_rgba(2,6,23,0.24)] transition-transform duration-200 lg:relative lg:inset-auto lg:z-20 lg:h-dvh lg:w-[var(--emp-sidebar-width)] lg:min-w-[var(--emp-sidebar-width)] lg:translate-x-0",
              collapsed ? "w-[6.5rem]" : "w-[328px]",
              mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}
          >
            <div className={cn("border-b border-white/8", collapsed ? "px-3 pb-4 pt-4" : "px-4 pb-4 pt-4")}>
              {collapsed ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.15rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(37,99,235,0.88),rgba(56,189,248,0.58))] text-sm font-semibold tracking-[0.18em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)]">
                    EMP
                  </div>
                  <button
                    type="button"
                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-label="Expand sidebar"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-3">
                    <div className="inline-flex min-h-7 items-center rounded-full border border-sky-300/18 bg-sky-400/10 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-sky-100/82">
                      Platform oversight
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
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-label="Collapse sidebar"
                  >
                    <PanelLeftClose className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="emp-shell-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain px-3 pb-4 pt-5">
                <div className="space-y-4">
                  <NavSection groups={PLATFORM_NAVIGATION_GROUPS} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
                </div>
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <Topbar
              persona={"platform_owner" as DashboardPersona}
              role={role ?? "platform_owner"}
            companyId={null}
            email={email}
            fullName={email ?? "Platform Owner"}
            billingContext={null}
            navigationGroups={PLATFORM_NAVIGATION_GROUPS}
            sidebarCollapsed={collapsed}
            onToggleSidebar={() => setCollapsed((prev) => !prev)}
            onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
          />
            <main className="emp-shell-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
              <div className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                <div className="page-wrap">{children}</div>
              </div>
            </main>
          </div>
        </div>

        {mobileOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
      </div>
      <CommandPalette persona={"platform_owner" as DashboardPersona} />
    </>
  );
};
