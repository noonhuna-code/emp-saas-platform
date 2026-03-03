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
import { SectionContainer } from "@/components/ui/SectionContainer";

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
    <SectionContainer title="Dashboard" subtitle="No widgets available for your scope." tone="soft">
      <p className="muted">Contact your administrator to enable additional modules.</p>
    </SectionContainer>
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
              <SectionContainer
                title="Platform Owner Workspace"
                subtitle="Use the isolated platform shell for global operations."
                tone="soft"
              >
                <Link href="/platform" className="secondary-btn" style={{ width: "fit-content" }}>
                  Open Platform Shell
                </Link>
              </SectionContainer>
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
