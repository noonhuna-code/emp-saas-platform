"use client";

import type { DashboardSession } from "@/lib/types/auth";
import type { BillingNavigationContext } from "@/lib/types/billing";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { Topbar } from "./Topbar";
import { PlanRouteGuard } from "@/components/guards/PlanRouteGuard";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import { prewarmDashboardData, prewarmRouteData, setClientCacheScope } from "@/lib/client/api";
import { SIDEBAR_COLLAPSED_WIDTH, SIDEBAR_EXPANDED_WIDTH } from "./Sidebar";

export const TenantShellFrame = ({
  session,
  billingContext,
  children
}: {
  session: DashboardSession;
  billingContext: BillingNavigationContext | null;
  children: React.ReactNode;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const persona = resolveDashboardPersona({
    role: session.role,
    permissions: session.permissions
  });
  const pathname = usePathname();
  const prewarmScheduledRef = useRef(false);

  useEffect(() => {
    const scopeKey = [session.companyId ?? "no-company", session.userId ?? "no-user", session.role ?? "no-role"].join(":");
    setClientCacheScope(scopeKey);
  }, [session.companyId, session.userId, session.role]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("emp-v2.sidebar.collapsed");
      setCollapsed(stored === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    const baseRoutes = ["/app/dashboard", "/app/attendance", "/app/leave", "/app/calendar"];
    const personaRoutes: Record<string, string[]> = {
      employee: ["/app/profile", "/app/notes", "/app/notifications", "/app/resources", "/app/chat", "/app/payslips", "/app/attendance/shift-swaps"],
      manager: ["/app/attendance/team", "/app/attendance/shift-swaps", "/app/approvals", "/app/employees", "/app/projects"],
      admin_ops: ["/app/leave/review", "/app/employees", "/app/payroll", "/app/billing", "/app/monitoring", "/app/notifications"],
      executive: ["/app/billing", "/app/monitoring", "/app/employees", "/app/payroll", "/app/approvals"],
      finance: ["/app/billing", "/app/payroll", "/app/payslips", "/app/notifications"],
      platform_owner: ["/platform"]
    };

    const warmRoutes = [...new Set([...baseRoutes, ...(personaRoutes[persona] ?? [])])];
    const timer = window.setTimeout(() => {
      for (const route of warmRoutes) prewarmRouteData(route);
    }, 40);

    return () => window.clearTimeout(timer);
  }, [persona]);

  useEffect(() => {
    if (pathname) prewarmRouteData(pathname);
  }, [pathname]);

  useEffect(() => {
    if (prewarmScheduledRef.current) return;
    prewarmScheduledRef.current = true;

    let timeoutId: number | null = null;
    let idleId: number | null = null;
    const run = () => prewarmDashboardData(persona);

    timeoutId = window.setTimeout(() => {
      const requestIdleCallbackFn = (window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; }).requestIdleCallback;
      if (typeof requestIdleCallbackFn === "function") {
        idleId = requestIdleCallbackFn(run, { timeout: 800 });
      } else {
        run();
      }
    }, 160);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null) {
        const cancelIdleCallbackFn = (window as Window & { cancelIdleCallback?: (id: number) => void; }).cancelIdleCallback;
        if (typeof cancelIdleCallbackFn === "function") cancelIdleCallbackFn(idleId);
      }
      prewarmScheduledRef.current = false;
    };
  }, [persona]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("emp-v2.sidebar.collapsed", next ? "1" : "0");
      } catch {
        // no-op
      }
      return next;
    });
  };

  const shellStyle = {
    "--emp-sidebar-width": collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
  } as CSSProperties;

  return (
    <div
      style={shellStyle}
      className="h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#f8fbff_0%,#eef4ff_42%,#e7eef9_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top,#081325_0%,#050b16_42%,#02050b_100%)] dark:text-slate-50"
    >
      <div className="flex h-dvh overflow-hidden lg:grid lg:grid-cols-[var(--emp-sidebar-width)_minmax(0,1fr)]">
        <Sidebar
          permissions={session.permissions}
          hasEmployeeContext={Boolean(session.employeeId)}
          entitlements={billingContext?.entitlements ?? null}
          persona={persona}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar
            persona={persona}
            role={session.role}
            permissions={session.permissions}
            companyId={session.companyId}
            email={session.email}
            fullName={session.fullName}
            employeeId={session.employeeId}
            employeeCode={session.employeeCode}
            avatarUrl={session.avatarUrl}
            lastLoginAt={session.lastLoginAt}
            shiftStartTime={session.shiftStartTime}
            shiftEndTime={session.shiftEndTime}
            shiftHours={session.shiftHours}
            billingContext={billingContext}
            sidebarCollapsed={collapsed}
            onToggleSidebar={toggleCollapsed}
            onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
          />

          <main className="emp-shell-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="mx-auto w-full max-w-[1720px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <PlanRouteGuard entitlements={billingContext?.entitlements ?? null}>{children}</PlanRouteGuard>
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

      <CommandPalette
        persona={persona}
        permissions={session.permissions}
        hasEmployeeContext={Boolean(session.employeeId)}
        entitlements={billingContext?.entitlements ?? null}
      />
    </div>
  );
};
