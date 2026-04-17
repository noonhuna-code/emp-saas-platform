"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchBillingOverview, fetchPayrollRuns, fetchPayslipHistory } from "@/lib/client/api";
import { syncRoleWorkspaceModules } from "@/components/dashboard/roleModuleSync";
import { PayrollAnalyticsWidgetsSection } from "@/components/dashboard/payroll-analytics/PayrollAnalyticsWidgetsSection";
import type { BillingOverview } from "@/lib/types/billing";
import type { PayrollRunsResponse, PayslipHistoryResponse } from "@/lib/types/payroll";
import { isFeatureEnabled } from "@/lib/client/entitlements";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ChartPanel,
  DashboardModuleDeck,
  DashboardScaffold,
  DashboardKpiTile,
  DashboardSection,
  QuickActionGrid,
  SignalRow,
  TimelineList,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";

const asCurrency = (value: number): string =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

const EMPTY_PAYROLL_RUNS: PayrollRunsResponse = { rows: [] };
const EMPTY_PAYSLIPS: PayslipHistoryResponse = {
  rows: [],
  page: 1,
  pageSize: 20,
  hasMore: false,
  viewerScope: "self"
};

export const FinanceDashboard = ({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) => {
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [runs, setRuns] = useState<PayrollRunsResponse>(EMPTY_PAYROLL_RUNS);
  const [payslips, setPayslips] = useState<PayslipHistoryResponse>(EMPTY_PAYSLIPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.allSettled([
      fetchBillingOverview(),
      fetchPayrollRuns({ limit: 8 }),
      fetchPayslipHistory({ page: 1, pageSize: 20 })
    ])
      .then(([billingSettled, runsSettled, payslipsSettled]) => {
        if (!active) return;

        const billingResult = billingSettled.status === "fulfilled" ? billingSettled.value : null;
        const runsResult = runsSettled.status === "fulfilled" ? runsSettled.value : null;
        const payslipsResult = payslipsSettled.status === "fulfilled" ? payslipsSettled.value : null;

        setBilling(billingResult?.ok && billingResult.data ? billingResult.data : null);
        setRuns(runsResult?.ok && runsResult.data ? runsResult.data : EMPTY_PAYROLL_RUNS);
        setPayslips(payslipsResult?.ok && payslipsResult.data ? payslipsResult.data : EMPTY_PAYSLIPS);

        if ((!billingResult?.ok || !billingResult.data) && (!runsResult?.ok || !runsResult.data) && (!payslipsResult?.ok || !payslipsResult.data)) {
          setError(
            billingResult?.error
            ?? runsResult?.error
            ?? payslipsResult?.error
            ?? "Unable to load finance dashboard"
          );
          return;
        }

        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load finance dashboard");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const totals = useMemo(() => {
    const rows = payslips?.rows ?? [];
    const totalNet = rows.reduce((sum, row) => sum + row.netSalary, 0);
    const paid = rows.filter((row) => row.status.toLowerCase() === "paid").length;
    return { totalNet, paid, count: rows.length };
  }, [payslips]);

  const runTimeline = useMemo(
    () =>
      (runs?.rows ?? []).slice(0, 6).map((row) => ({
        title: `${String(row.month).padStart(2, "0")}/${row.year}`,
        subtitle: `${row.start_date} - ${row.end_date}`,
        meta: row.status
      })),
    [runs]
  );

  const analyticsStandardEnabled = isFeatureEnabled(billing?.entitlements, "feature.analytics_standard");
  const analyticsAdvancedEnabled = isFeatureEnabled(billing?.entitlements, "feature.analytics_advanced");

  const heroActions = [
    allowedRouteSet.has("/app/billing") ? { href: "/app/billing", label: "Billing", tone: "primary" as const } : null,
    allowedRouteSet.has("/app/payroll") ? { href: "/app/payroll", label: "Payroll", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/payslips") ? { href: "/app/payslips", label: "Payslips", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/loans") ? { href: "/app/loans", label: "Loans", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;

  const operationalModules = [
    allowedRouteSet.has("/app/billing") ? { label: "Billing console", href: "/app/billing", caption: "Invoices and payment proofs" } : null,
    allowedRouteSet.has("/app/payroll") ? { label: "Payroll runs", href: "/app/payroll", caption: "Run lifecycle and statuses" } : null,
    allowedRouteSet.has("/app/payslips") ? { label: "Payslip history", href: "/app/payslips", caption: "Snapshot review" } : null,
    allowedRouteSet.has("/app/loans") ? { label: "Loans & advances", href: "/app/loans", caption: "Request and review flow" } : null,
    allowedRouteSet.has("/app/notifications") ? { label: "Notifications", href: "/app/notifications", caption: "Finance alerts" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;

  const actionPaths = [
    allowedRouteSet.has("/app/payroll") ? { label: "Payroll runs", href: "/app/payroll", caption: "Lifecycle and closeout" } : null,
    allowedRouteSet.has("/app/payslips") ? { label: "Payslip history", href: "/app/payslips", caption: "Delivery and audit checks" } : null,
    allowedRouteSet.has("/app/loans") ? { label: "Loans & advances", href: "/app/loans", caption: "Employee-linked financial requests" } : null,
    allowedRouteSet.has("/app/billing") ? { label: "Billing console", href: "/app/billing", caption: "Invoices and proofs" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approvals queue", href: "/app/approvals", caption: "Pending blockers" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;
  const workspaceModules = [
    allowedRouteSet.has("/app/payroll")
      ? {
          title: "Payroll operations lane",
          description: "Work through run lifecycle, closeout readiness, and payroll visibility from one finance-first starting point.",
          href: "/app/payroll",
          label: "Payroll",
          metric: `${runs.rows.length} runs`,
          highlights: ["Runs", "Closeout", "Delivery"]
        }
      : null,
    allowedRouteSet.has("/app/billing")
      ? {
          title: "Billing and subscription posture",
          description: "Keep plan status, invoices, and seat pressure visible before finance risk turns into operational friction.",
          href: "/app/billing",
          label: "Billing",
          metric: billing?.subscription?.status ?? "Active",
          highlights: ["Invoices", "Plan status", "Seats"]
        }
      : null,
    (allowedRouteSet.has("/app/payslips") || allowedRouteSet.has("/app/loans"))
      ? {
          title: "Employee finance delivery",
          description: "Track employee-facing finance surfaces like payslips and requests without leaving the finance shell.",
          href: allowedRouteSet.has("/app/payslips") ? "/app/payslips" : "/app/loans",
          label: "Delivery",
          metric: `${totals.count} rows`,
          highlights: [allowedRouteSet.has("/app/payslips") ? "Payslips" : "Payroll", allowedRouteSet.has("/app/loans") ? "Loans & advances" : "Finance history", "Employee linked"]
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; description: string; href: string; label?: string; metric?: string; highlights?: string[] }>;
  const syncedWorkspaceModules = syncRoleWorkspaceModules({
    baseModules: workspaceModules,
    allowedRoutes: allowedRouteSet,
    preferredRoutes: ["/app/notifications", "/app/approvals", "/app/settings", "/app/analytics", "/app/resources"],
  });
  const seatSummary = billing?.seatSummary ?? {
    activeTotal: 0,
    activeBillable: 0,
    seatLimit: null,
    seatsRemaining: null
  };
  const recentInvoices = billing?.recentInvoices ?? [];
  const heroSignals = [
    { label: "Billing", value: billing?.subscription?.status ?? "Loading" },
    { label: "Runs", value: runs?.rows.length ? `${runs.rows.length} in view` : "Ready" },
    { label: "Payslips", value: payslips?.rows.length ? `${payslips.rows.length} rows` : "Snapshot ready" }
  ];

  if (loading) return <LoadingState label="Loading finance dashboard..." />;
  if (error && !billing && runs.rows.length === 0 && payslips.rows.length === 0) {
    return <ErrorState message={error} />;
  }

  return (
    <DashboardScaffold
        eyebrow="Finance Workspace"
        title="Payroll and billing operations"
        subtitle="Track invoice health, payroll runs, and payslip output from one operational view."
        emphasis="operations"
        heroSignals={heroSignals}
        actions={(
          <>
            {heroActions.map((action) => (
              <Link key={action.href} href={action.href} className={action.tone === "primary" ? "primary-btn" : "secondary-btn"}>
                {action.label}
              </Link>
            ))}
          </>
        )}
        value={view}
        onViewChange={setView}
        modeTitle="Workspace lenses"
        modeSubtitle="Switch between finance operations, commercial visibility, and payroll execution context without leaving the same shell."
      >

      <DashboardSection visible={view === "workspace"}>
        <div className="dashboard-kpi-grid">
          <DashboardKpiTile
            label="Subscription"
            value={billing?.subscription?.status ?? "-"}
            hint={billing?.subscription?.planName ?? "No active plan"}
            accent={billing?.subscription?.status === "past_due" ? "warning" : "success"}
          />
          <DashboardKpiTile
            label="Active seats"
            value={seatSummary.activeBillable}
            hint={seatSummary.seatLimit ? `Limit ${seatSummary.seatLimit}` : "Custom limit"}
            accent="info"
          />
          <DashboardKpiTile
            label="Payslip rows"
            value={totals.count}
            hint={`Paid ${totals.paid}`}
            accent="info"
          />
          <DashboardKpiTile
            label="Net total (page)"
            value={asCurrency(totals.totalNet)}
            hint="Read-only snapshot"
            accent="success"
          />
        </div>

        {syncedWorkspaceModules.length > 0 ? (
          <ChartPanel title="Workspace modules" subtitle="TailAdmin-style finance modules for payroll, billing, and employee-facing delivery.">
            <DashboardModuleDeck modules={syncedWorkspaceModules} />
          </ChartPanel>
        ) : null}

        <WorkflowPanel title="Operational modules" subtitle="Finance workflows and controls">
          <QuickActionGrid actions={operationalModules} />
        </WorkflowPanel>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        {(analyticsStandardEnabled || analyticsAdvancedEnabled) ? (
          <PayrollAnalyticsWidgetsSection
            title="Payroll analytics"
            subtitle="Finance trend, delivery quality, growth, and closeout latency"
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Billing summary" subtitle="Current period health">
            <SignalRow label="Plan" value={billing?.subscription?.planName ?? "-"} />
            <SignalRow label="Status" value={<StatusBadge status={billing?.subscription?.status ?? "unknown"} />} />
            <SignalRow label="Period end" value={billing?.subscription?.currentPeriodEnd ?? "-"} />
            <SignalRow label="Recent invoices" value={recentInvoices.length} />
          </ChartPanel>

          <ChartPanel title="Payroll trend" subtitle="Recent run lifecycle statuses">
            {runTimeline.length > 0 ? <TimelineList items={runTimeline} /> : <p className="muted">No payroll runs available.</p>}
          </ChartPanel>
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Recent invoices" subtitle="Latest billing documents">
            {recentInvoices.length === 0 ? <p className="muted">No invoices found.</p> : null}
            {recentInvoices.slice(0, 8).map((invoice) => (
              <div key={invoice.id} className="row" style={{ justifyContent: "space-between" }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{invoice.invoiceNumber}</strong>
                  <span className="muted">{invoice.periodStart} - {invoice.periodEnd}</span>
                </div>
                <div className="row">
                  <StatusBadge status={invoice.status} />
                  <span className="muted">{asCurrency(invoice.totalMinor / 100)}</span>
                </div>
              </div>
            ))}
          </WorkflowPanel>

          <WorkflowPanel title="Finance action paths" subtitle="Fast routes for closeout, invoice review, and payroll delivery">
            <QuickActionGrid actions={actionPaths} />
            <SignalRow label="Invoice count in view" value={recentInvoices.length} />
            <SignalRow label="Paid payslips" value={totals.paid} tone="success" />
          </WorkflowPanel>
        </div>
      </DashboardSection>
    </DashboardScaffold>
  );
};
