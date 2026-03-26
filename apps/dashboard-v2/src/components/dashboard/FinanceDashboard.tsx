"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { fetchBillingOverview, fetchPayrollRuns, fetchPayslipHistory } from "@/lib/client/api";
import type { BillingOverview } from "@/lib/types/billing";
import type { PayrollRunsResponse, PayslipHistoryResponse } from "@/lib/types/payroll";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ChartPanel,
  DashboardHero,
  DashboardKpiTile,
  DashboardModeSwitch,
  DashboardSection,
  QuickActionGrid,
  SignalRow,
  TimelineList,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";

const asCurrency = (value: number): string =>
  new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export const FinanceDashboard = ({
  allowedRoutes = [],
}: {
  allowedRoutes?: string[];
}) => {
  const [billing, setBilling] = useState<BillingOverview | null>(null);
  const [runs, setRuns] = useState<PayrollRunsResponse | null>(null);
  const [payslips, setPayslips] = useState<PayslipHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("workspace");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void Promise.all([
      fetchBillingOverview(),
      fetchPayrollRuns({ limit: 8 }),
      fetchPayslipHistory({ page: 1, pageSize: 20 })
    ])
      .then(([billingResult, runsResult, payslipsResult]) => {
        if (!active) return;

        if (!billingResult.ok || !billingResult.data) {
          setError(billingResult.error ?? "Unable to load finance dashboard");
          return;
        }
        setBilling(billingResult.data);

        setRuns(runsResult.ok && runsResult.data ? runsResult.data : { rows: [] });
        setPayslips(
          payslipsResult.ok && payslipsResult.data
            ? payslipsResult.data
            : { rows: [], page: 1, pageSize: 20, hasMore: false, viewerScope: "self" }
        );
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

  const heroActions = [
    allowedRouteSet.has("/app/billing") ? { href: "/app/billing", label: "Billing", tone: "primary" as const } : null,
    allowedRouteSet.has("/app/payroll") ? { href: "/app/payroll", label: "Payroll", tone: "secondary" as const } : null,
    allowedRouteSet.has("/app/payslips") ? { href: "/app/payslips", label: "Payslips", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;

  const operationalModules = [
    allowedRouteSet.has("/app/billing") ? { label: "Billing console", href: "/app/billing", caption: "Invoices and payment proofs" } : null,
    allowedRouteSet.has("/app/payroll") ? { label: "Payroll runs", href: "/app/payroll", caption: "Run lifecycle and statuses" } : null,
    allowedRouteSet.has("/app/payslips") ? { label: "Payslip history", href: "/app/payslips", caption: "Snapshot review" } : null,
    allowedRouteSet.has("/app/notifications") ? { label: "Notifications", href: "/app/notifications", caption: "Finance alerts" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;

  const actionPaths = [
    allowedRouteSet.has("/app/payroll") ? { label: "Payroll runs", href: "/app/payroll", caption: "Lifecycle and closeout" } : null,
    allowedRouteSet.has("/app/payslips") ? { label: "Payslip history", href: "/app/payslips", caption: "Delivery and audit checks" } : null,
    allowedRouteSet.has("/app/billing") ? { label: "Billing console", href: "/app/billing", caption: "Invoices and proofs" } : null,
    allowedRouteSet.has("/app/approvals") ? { label: "Approvals queue", href: "/app/approvals", caption: "Pending blockers" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;

  if (loading) return <LoadingState label="Loading finance dashboard..." />;
  if (error || !billing) return <ErrorState message={error ?? "Finance dashboard unavailable"} />;

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="Finance Workspace"
        title="Payroll and billing operations"
        subtitle="Track invoice health, payroll runs, and payslip output from one operational view."
        emphasis="operations"
        actions={(
          <>
            {heroActions.map((action) => (
              <Link key={action.href} href={action.href} className={action.tone === "primary" ? "primary-btn" : "secondary-btn"}>
                {action.label}
              </Link>
            ))}
          </>
        )}
      />

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Workspace lenses"
        subtitle="Switch between finance operations, commercial visibility, and payroll execution context without leaving the same shell."
      />

      <DashboardSection visible={view === "workspace"}>
        <div className="dashboard-kpi-grid">
          <DashboardKpiTile
            label="Subscription"
            value={billing.subscription?.status ?? "-"}
            hint={billing.subscription?.planName ?? "No active plan"}
            accent={billing.subscription?.status === "past_due" ? "warning" : "success"}
          />
          <DashboardKpiTile
            label="Active seats"
            value={billing.seatSummary.activeBillable}
            hint={billing.seatSummary.seatLimit ? `Limit ${billing.seatSummary.seatLimit}` : "Custom limit"}
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

        <WorkflowPanel title="Operational modules" subtitle="Finance workflows and controls">
          <QuickActionGrid actions={operationalModules} />
        </WorkflowPanel>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartPanel title="Billing summary" subtitle="Current period health">
            <SignalRow label="Plan" value={billing.subscription?.planName ?? "-"} />
            <SignalRow label="Status" value={<StatusBadge status={billing.subscription?.status ?? "unknown"} />} />
            <SignalRow label="Period end" value={billing.subscription?.currentPeriodEnd ?? "-"} />
            <SignalRow label="Recent invoices" value={billing.recentInvoices.length} />
          </ChartPanel>

          <ChartPanel title="Payroll trend" subtitle="Recent run lifecycle statuses">
            {runTimeline.length > 0 ? <TimelineList items={runTimeline} /> : <p className="muted">No payroll runs available.</p>}
          </ChartPanel>
        </div>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Recent invoices" subtitle="Latest billing documents">
            {billing.recentInvoices.length === 0 ? <p className="muted">No invoices found.</p> : null}
            {billing.recentInvoices.slice(0, 8).map((invoice) => (
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
            <SignalRow label="Invoice count in view" value={billing.recentInvoices.length} />
            <SignalRow label="Paid payslips" value={totals.paid} tone="success" />
          </WorkflowPanel>
        </div>
      </DashboardSection>
    </div>
  );
};
