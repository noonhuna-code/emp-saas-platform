"use client";

import type { DashboardSession } from "@/lib/types/auth";
import type { BillingNavigationContext } from "@/lib/types/billing";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { PlanRouteGuard } from "@/components/guards/PlanRouteGuard";

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

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("emp.sidebar.collapsed");
      setCollapsed(stored === "1");
    } catch {
      setCollapsed(false);
    }
  }, []);

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
    <div className={`layout-shell ${collapsed ? "layout-shell--collapsed" : ""} ${mobileOpen ? "layout-shell--mobile-open" : ""}`}>
      <Sidebar
        permissions={session.permissions}
        hasEmployeeContext={Boolean(session.employeeId)}
        entitlements={billingContext?.entitlements ?? null}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapsed={toggleCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="content-area">
        <Topbar
          role={session.role}
          companyId={session.companyId}
          email={session.email}
          fullName={session.fullName}
          avatarUrl={session.avatarUrl}
          lastLoginAt={session.lastLoginAt}
          shiftStartTime={session.shiftStartTime}
          shiftEndTime={session.shiftEndTime}
          shiftHours={session.shiftHours}
          billingContext={billingContext}
          onToggleSidebar={toggleCollapsed}
          onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
        />
        <main onClick={() => { if (mobileOpen) setMobileOpen(false); }}>
          <PlanRouteGuard entitlements={billingContext?.entitlements ?? null}>
            {children}
          </PlanRouteGuard>
        </main>
      </div>
    </div>
  );
};
