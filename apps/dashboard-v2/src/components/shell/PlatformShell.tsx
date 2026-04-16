"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { NavSection } from "@/components/shell/NavSection";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { ProductCredit } from "@/components/shell/ProductCredit";
import { Topbar } from "@/components/shell/Topbar";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import type { NavigationGroup } from "@/navigation/navigation.config";
import { cn } from "@/lib/utils";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from "./Sidebar";

const PLATFORM_SIDEBAR_BACKGROUND =
  "bg-white dark:bg-gray-900";

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
        className="h-dvh overflow-hidden bg-gray-50 text-slate-950 dark:bg-gray-950 dark:text-slate-50"
      >
        <div className="flex h-dvh overflow-hidden lg:grid lg:grid-cols-[var(--emp-sidebar-width)_minmax(0,1fr)]">
          <aside
            className={cn(
              `fixed inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-gray-200 ${PLATFORM_SIDEBAR_BACKGROUND} text-gray-900 shadow-[0_1px_3px_rgba(16,24,40,0.1),0_12px_24px_rgba(16,24,40,0.08)] transition-transform duration-200 dark:border-gray-800 dark:text-white/90 lg:relative lg:inset-auto lg:z-20 lg:h-dvh lg:w-[var(--emp-sidebar-width)] lg:min-w-[var(--emp-sidebar-width)] lg:translate-x-0`,
              collapsed ? "w-[6.5rem]" : "w-[328px]",
              mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            )}
          >
            <div className={cn("border-b border-gray-200 dark:border-gray-800", collapsed ? "px-3 pb-4 pt-4" : "px-4 pb-4 pt-4")}>
              {collapsed ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-sm font-semibold tracking-[0.18em] text-white shadow-theme-md">
                    EMP
                  </div>
                  <button
                    type="button"
                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white lg:inline-flex"
                    onClick={() => setCollapsed((prev) => !prev)}
                    aria-label="Expand sidebar"
                  >
                    <PanelLeftOpen className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-3">
                    <div className="inline-flex min-h-7 items-center rounded-full bg-brand-50 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                      Platform oversight
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-sm font-semibold tracking-[0.18em] text-white shadow-theme-md">
                        EMP
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-[1.5rem] font-semibold tracking-[-0.06em] text-gray-900 dark:text-white/90">EMP Workforce OS</div>
                        <div className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">TailAdmin platform oversight</div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-white lg:inline-flex"
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
                <div className="space-y-6">
                  <div className="page-wrap">{children}</div>
                  <ProductCredit />
                </div>
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
