"use client";

import Link from "next/link";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { FounderDashboard } from "@/components/dashboard/FounderDashboard";
import { TeamLeadDashboard } from "@/components/dashboard/TeamLeadDashboard";
import {
  DashboardWidgetGuard,
  DashboardWidgetCapabilitiesProvider
} from "@/components/dashboard/dashboard-widget-guard";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import {
  getVisibleDashboardWidgets,
  resolveDashboardWidgetCapabilities
} from "@/lib/dashboard/dashboard-widget-capabilities";

export const DashboardPageClient = ({
  role,
  permissions
}: {
  role: string | null;
  permissions: string[];
}) => {
  const persona = resolveDashboardPersona({ role, permissions });
  const userCapabilities = resolveDashboardWidgetCapabilities({ role, permissions });
  const visibleWidgets = getVisibleDashboardWidgets(userCapabilities);
  const emptyDashboard = (
    <section className="card stack fade-in">
      <h1>Dashboard</h1>
      <p className="muted">No dashboard widgets available.</p>
    </section>
  );

  if (persona !== "platform_owner" && visibleWidgets.length === 0) {
    return emptyDashboard;
  }

  return (
    <DashboardWidgetCapabilitiesProvider userCapabilities={userCapabilities}>
      {(() => {
        switch (persona) {
          case "founder":
            return (
              <DashboardWidgetGuard widget="payroll_trend" fallback={emptyDashboard}>
                <FounderDashboard />
              </DashboardWidgetGuard>
            );
          case "admin":
            return (
              <DashboardWidgetGuard widget="system_health" fallback={emptyDashboard}>
                <AdminDashboard />
              </DashboardWidgetGuard>
            );
          case "hr":
            return (
              <DashboardWidgetGuard widget="payroll_summary" fallback={emptyDashboard}>
                <HRDashboard />
              </DashboardWidgetGuard>
            );
          case "team_lead":
            return (
              <DashboardWidgetGuard widget="attendance_overview" fallback={emptyDashboard}>
                <TeamLeadDashboard />
              </DashboardWidgetGuard>
            );
          case "manager":
            return (
              <DashboardWidgetGuard widget="attendance_overview" fallback={emptyDashboard}>
                <ManagerDashboard />
              </DashboardWidgetGuard>
            );
          case "platform_owner":
            return (
              <section className="card stack fade-in">
                <h1>Platform Owner Workspace</h1>
                <p className="muted">
                  Platform Owner users must use the isolated <code>/platform</code> shell. Tenant dashboard access is intentionally disabled.
                </p>
                <Link href="/platform" className="secondary-btn" style={{ width: "fit-content" }}>
                  Open Platform Shell
                </Link>
              </section>
            );
          case "employee":
          default:
            return (
              <DashboardWidgetGuard widget="employee_self_summary" fallback={emptyDashboard}>
                <EmployeeDashboard />
              </DashboardWidgetGuard>
            );
        }
      })()}
    </DashboardWidgetCapabilitiesProvider>
  );
};
