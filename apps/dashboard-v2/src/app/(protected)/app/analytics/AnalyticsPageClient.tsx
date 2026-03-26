"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAdminDashboard,
  fetchBillingOverview,
  fetchEmployeeDashboard,
  fetchManagerDashboard,
  fetchMonitoringOverview,
} from "@/lib/client/api";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import type { AdminDashboardResponse, EmployeeDashboardResponse, ManagerDashboardResponse } from "@/lib/types/dashboard";
import type { BillingOverview } from "@/lib/types/billing";
import type { MonitoringOverview } from "@/lib/types/monitoring";
import {
  DashboardRail,
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";

const asCurrency = (value: number) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const AnalyticsPageClient = ({
  role,
  permissions,
  hasEmployeeContext,
}: {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
}) => {
  const [adminData, setAdminData] = useState<AdminDashboardResponse | null>(null);
  const [managerData, setManagerData] = useState<ManagerDashboardResponse | null>(null);
  const [employeeData, setEmployeeData] = useState<EmployeeDashboardResponse | null>(null);
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [monitoring, setMonitoring] = useState<MonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const persona = resolveDashboardPersona({ role, permissions });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const requests: Array<Promise<unknown>> = [];

      if (persona === "admin_ops" || persona === "executive") {
        requests.push(
          fetchAdminDashboard().then((result) => {
            if (result.ok && result.data) setAdminData(result.data);
          })
        );
      }

      if (persona === "manager") {
        requests.push(
          fetchManagerDashboard().then((result) => {
            if (result.ok && result.data) setManagerData(result.data);
          })
        );
      }

      if (hasEmployeeContext && (persona === "employee" || persona === "manager" || persona === "admin_ops")) {
        requests.push(
          fetchEmployeeDashboard().then((result) => {
            if (result.ok && result.data) setEmployeeData(result.data);
          })
        );
      }

      if (persona === "finance" || persona === "admin_ops" || persona === "executive" || permissions.includes("view_billing")) {
        requests.push(
          fetchBillingOverview().then((result) => {
            if (result.ok && result.data) setBilling(result.data);
          })
        );
      }

      if (persona === "admin_ops" || persona === "executive") {
        requests.push(
          fetchMonitoringOverview().then((result) => {
            if (result.ok && result.data) setMonitoring(result.data);
          })
        );
      }

      await Promise.all(requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics workspace");
    } finally {
      setLoading(false);
    }
  }, [hasEmployeeContext, permissions, persona]);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = useMemo(() => {
    const items: Array<{ label: string; value: string | number; hint: string }> = [];

    if (adminData) {
      items.push(
        { label: "Headcount", value: adminData.headcount.total, hint: `Active ${adminData.headcount.active}` },
        { label: "Attendance rate", value: `${adminData.attendanceRate ?? 0}%`, hint: "Current admin-level attendance signal" },
        { label: "Leave utilization", value: `${adminData.leaveUtilization ?? 0}%`, hint: "Cross-company leave use snapshot" }
      );
      if (adminData.payrollSnapshot) {
        items.push({
          label: "Payroll snapshot",
          value: asCurrency(adminData.payrollSnapshot.totalNet),
          hint: adminData.payrollSnapshot.status,
        });
      }
    }

    if (managerData) {
      items.push(
        { label: "Pending leave", value: managerData.pendingLeaveApprovals, hint: "Leave decisions waiting for review" },
        { label: "Pending overtime", value: managerData.pendingOvertimeApprovals, hint: "Overtime requests still open" },
        { label: "Team reliability", value: managerData.teamReliabilityScore ?? "-", hint: "Current manager/team lead reliability score" }
      );
    }

    if (employeeData) {
      items.push(
        { label: "Unread notifications", value: employeeData.workspace.counts.unreadNotifications, hint: "Role-scoped signal load" },
        { label: "Resources", value: employeeData.workspace.counts.resources, hint: "Guides, SOPs, and knowledge entries" },
        { label: "Chat messages", value: employeeData.workspace.counts.chatMessages, hint: "Recent collaboration items in scope" }
      );
    }

    if (billing) {
      items.push({
        label: "Billable seats",
        value: billing.seatSummary.activeBillable,
        hint: billing.subscription?.planName ?? "Billing active",
      });
    }

    if (monitoring) {
      items.push({
        label: "Approval failures",
        value: monitoring.approvalFailures.reduce((sum, row) => sum + row.count, 0),
        hint: "Monitoring failures in the latest snapshot",
      });
    }

    return items.slice(0, 8);
  }, [adminData, billing, employeeData, managerData, monitoring]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState label="Loading analytics workspace..." />
      </PageContainer>
    );
  }

  if (error && cards.length === 0) {
    return (
      <PageContainer>
        <ErrorState message={error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Analytics"
        title="Role-aware workforce and operations insight"
        description="Use one analytics landing surface to understand workforce pressure, operational trends, and the signals that deserve a deeper drill-down."
        chips={["Role-aware sources", "Decision support", "Calm visibility", "No fake chart wall"]}
      />

      <FeatureCallout
        badge="Visibility"
        title="A quieter analytics layer that stays close to real operating decisions."
        description="This workspace summarizes the signals already available to your role instead of pretending every user needs the same chart wall. It keeps the product calm while still exposing meaningful visibility."
      />

      {cards.length > 0 ? (
        <StatGrid>
          {cards.map((card) => (
            <StatCard key={`${card.label}-${card.hint}`} label={card.label} value={card.value} hint={card.hint} />
          ))}
        </StatGrid>
      ) : null}

      <DashboardRail>
        <SurfacePanel title="Analytics lanes" description="What is currently visible from your role and why it matters.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">Workforce visibility</p>
                <StatusChip label={adminData || managerData || employeeData ? "Active" : "Unavailable"} tone={adminData || managerData || employeeData ? "success" : "default"} compact />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Headcount, attendance, leave, and role-scoped activity signals stay tied to the people model already present in the app.</p>
            </div>
            <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-950">Commercial and risk signals</p>
                <StatusChip label={billing || monitoring ? "Active" : "Unavailable"} tone={billing || monitoring ? "success" : "default"} compact />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">Billing posture, payroll-adjacent snapshots, and monitoring pressure surface only when your role is allowed to see them.</p>
            </div>
          </div>
        </SurfacePanel>

        <div className="space-y-6">
          <SurfacePanel title="Current insight sources" description="The real data sources backing this page right now.">
            <div className="space-y-3">
              {[
                adminData ? "Admin dashboard overview" : null,
                managerData ? "Manager dashboard overview" : null,
                employeeData ? "Employee workspace overview" : null,
                billing ? "Billing overview" : null,
                monitoring ? "Monitoring overview" : null,
              ]
                .filter(Boolean)
                .map((item) => (
                  <div key={item as string} className="rounded-2xl border border-slate-200/80 bg-white/92 px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              {!adminData && !managerData && !employeeData && !billing && !monitoring ? (
                <EmptyState title="No analytics sources available" subtitle="This role does not currently expose additional analytics inputs." compact />
              ) : null}
            </div>
          </SurfacePanel>

          <SurfacePanel title="Next drill-down paths" description="Use these routes when you need detail, not just signal.">
            <div className="grid gap-3">
              <Link href="/app/dashboard" className="secondary-btn justify-center">Role dashboard</Link>
              <Link href="/app/organization" className="secondary-btn justify-center">Organization</Link>
              <Link href="/app/payroll" className="secondary-btn justify-center">Payroll</Link>
              <Link href="/app/monitoring" className="secondary-btn justify-center">System monitor</Link>
            </div>
          </SurfacePanel>
        </div>
      </DashboardRail>
    </PageContainer>
  );
};

export default AnalyticsPageClient;
