"use client";

import { useState, type ReactNode } from "react";
import { NavSection } from "@/components/shell/NavSection";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { Topbar } from "@/components/shell/Topbar";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import type { NavigationGroup } from "@/navigation/navigation.config";
import { cn } from "@/lib/utils";

const PLATFORM_NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: "platform-home",
    label: "Platform",
    items: [
      {
        href: "/platform",
        label: "Overview",
        icon: "home",
        description: "Global oversight and control"
      },
      {
        href: "/app/monitoring",
        label: "Monitoring",
        icon: "monitoring",
        description: "Security and system signals"
      },
      {
        href: "/app/billing",
        label: "Billing",
        icon: "billing",
        description: "Subscriptions and tenant health"
      },
      {
        href: "/app/settings",
        label: "Settings",
        icon: "settings",
        description: "Platform preferences"
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

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fbff_0%,#eef4ff_42%,#e7eef9_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,#081325_0%,#050b16_42%,#02050b_100%)] dark:text-slate-50">
        <div className="flex min-h-screen">
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
                    P
                  </div>
                  {!collapsed ? (
                    <div className="min-w-0 space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300/70">Platform oversight</div>
                      <div className="text-2xl font-semibold tracking-tight text-white">EMP OS V2</div>
                      <div className="text-sm leading-5 text-slate-400">Cross-tenant governance console</div>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white lg:inline-flex"
                  onClick={() => setCollapsed((prev) => !prev)}
                  aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  <span className="text-sm font-medium">{collapsed ? ">" : "<"}</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
              <NavSection groups={PLATFORM_NAVIGATION_GROUPS} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar
              persona={"platform_owner" as DashboardPersona}
              role={role ?? "platform_owner"}
              companyId={null}
              email={email}
              fullName={email ?? "Platform Owner"}
              billingContext={null}
              onToggleSidebar={() => setCollapsed((prev) => !prev)}
              onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
            />
            <main className="min-h-0 flex-1 overflow-y-auto">
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
