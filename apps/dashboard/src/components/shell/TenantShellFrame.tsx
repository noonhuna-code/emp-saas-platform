"use client";

import type { DashboardSession } from "@/lib/types/auth";
import type { BillingNavigationContext } from "@/lib/types/billing";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { CommandPalette } from "./CommandPalette";
import { Topbar } from "./Topbar";
import { PlanRouteGuard } from "@/components/guards/PlanRouteGuard";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import { prewarmDashboardData } from "@/lib/client/api";

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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("emp.sidebar.collapsed");
      setCollapsed(stored === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    prewarmDashboardData(persona);
  }, [persona]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("emp.sidebar.collapsed", next ? "1" : "0");
      } catch {
        // no-op
      }
      return next;
    });
  };

  return (
    <DashboardLayout
      shellClassName={`app-shell ${collapsed ? "app-shell--collapsed" : ""} ${mobileOpen ? "app-shell--mobile-open" : ""}`}
      sidebar={(
        <Sidebar
          permissions={session.permissions}
          hasEmployeeContext={Boolean(session.employeeId)}
          entitlements={billingContext?.entitlements ?? null}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapsed={toggleCollapsed}
          onCloseMobile={() => setMobileOpen(false)}
        />
      )}
      header={(
        <Topbar
          persona={persona}
          role={session.role}
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
          onToggleSidebar={toggleCollapsed}
          onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
        />
      )}
      mobileOpen={mobileOpen}
      onCloseMobile={() => setMobileOpen(false)}
    >
      <PlanRouteGuard entitlements={billingContext?.entitlements ?? null}>
        {children}
      </PlanRouteGuard>
      <CommandPalette persona={persona} />
    </DashboardLayout>
  );
};










