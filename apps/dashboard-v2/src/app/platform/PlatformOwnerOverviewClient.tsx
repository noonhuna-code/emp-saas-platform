"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchPlatformOverview } from "@/lib/client/api";
import type { PlatformOverviewResponse } from "@/lib/types/platform";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LineChart, MiniBarChart } from "@/components/shared/Charts";
import { DashboardHero, DashboardKpiTile, DashboardPanel, SignalRow } from "@/components/dashboard/DashboardPrimitives";
import { FeatureCallout, PageContainer, PageHeader } from "@/components/dashboard-v2/PagePrimitives";

const formatMinorCurrency = (minor: number, currencyCode = "PKR"): string => {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(minor / 100);
};

export const PlatformOwnerOverviewClient = () => {
  const [data, setData] = useState<PlatformOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchPlatformOverview()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load platform overview");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load platform overview");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const topCompanies = useMemo(() => {
    if (!data) return [];
    return data.companies
      .slice()
      .sort((a, b) => b.billableSeats - a.billableSeats)
      .slice(0, 10);
  }, [data]);

  const upcomingRenewals = useMemo(() => {
    if (!data) return [];
    const now = Date.now();
    const in14Days = now + 14 * 24 * 60 * 60 * 1000;

    return data.companies
      .filter((company) => company.currentPeriodEnd && (company.subscriptionStatus === "active" || company.subscriptionStatus === "trialing"))
      .map((company) => {
        const periodEndMs = new Date(company.currentPeriodEnd as string).getTime();
        return { company, periodEndMs };
      })
      .filter((row) => Number.isFinite(row.periodEndMs) && row.periodEndMs >= now && row.periodEndMs <= in14Days)
      .sort((a, b) => a.periodEndMs - b.periodEndMs)
      .slice(0, 12);
  }, [data]);

  const revenueProxy = useMemo(() => {
    if (!data) return { mrrProxyMinor: 0, arrProxyMinor: 0, conversionRate: 0 };
    const mrrProxyMinor = data.kpis.collectedLast30dMinor;
    const arrProxyMinor = mrrProxyMinor * 12;
    const funnelBase = data.kpis.activeSubscriptions + data.kpis.trialingSubscriptions;
    const conversionRate = funnelBase > 0 ? Math.round((data.kpis.activeSubscriptions / funnelBase) * 100) : 0;
    return { mrrProxyMinor, arrProxyMinor, conversionRate };
  }, [data]);

  const systemHealthScore = useMemo(() => {
    if (!data) return 0;
    const base = 100;
    const overduePenalty = Math.min(35, data.kpis.overdueInvoices * 2);
    const pastDuePenalty = Math.min(30, data.kpis.pastDueSubscriptions * 3);
    const approvalsPenalty = Math.min(20, data.kpis.pendingApprovals * 2);
    return Math.max(0, base - overduePenalty - pastDuePenalty - approvalsPenalty);
  }, [data]);

  const auditHeatmap = useMemo(() => {
    if (!data) return [] as number[];
    const dayCounts = new Map<string, number>();
    for (const event of data.recentAudit) {
      const day = event.createdAt.slice(0, 10);
      dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    }

    const values: number[] = [];
    for (let idx = 13; idx >= 0; idx -= 1) {
      const date = new Date(Date.now() - idx * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      values.push(dayCounts.get(key) ?? 0);
    }
    return values;
  }, [data]);

  const paymentQueueTrend = useMemo(() => {
    if (!data) return [] as number[];
    return data.paymentQueue
      .slice()
      .reverse()
      .slice(0, 12)
      .map((item) => item.subtotalMinor / 100);
  }, [data]);

  if (loading) return <LoadingState label="Loading platform owner dashboard..." />;
  if (error || !data) return <ErrorState message={error ?? "Platform overview unavailable"} />;

  return (
    <PageContainer className="fade-in">
      <PageHeader
        eyebrow="Platform"
        title="Cross-tenant oversight, billing health, and governance signal"
        description="Use the isolated platform shell for global company visibility, subscription pressure, immutable billing audit review, and system-level follow-up."
        chips={["Platform owner", "Cross-tenant read-only", "Billing governance", "Oversight shell"]}
      />

      <FeatureCallout
        badge="Platform oversight"
        title="A calmer command surface for tenant health, delinquency risk, and global governance."
        description="This view stays intentionally focused on the operational signals a platform owner needs first: companies, subscriptions, renewal pressure, payment queue health, and immutable audit movement."
      />

      <DashboardHero
        eyebrow="Platform Owner"
        title="Global companies, billing, and governance view"
        subtitle="Cross-tenant operational dashboard for platform-level oversight. Company data is read-only and permission-gated."
        emphasis="executive"
      />

      <div className="dashboard-kpi-grid">
        <DashboardKpiTile label="Companies" value={data.kpis.totalCompanies} hint={`Active ${data.kpis.activeCompanies}`} accent="info" />
        <DashboardKpiTile label="Subscriptions" value={data.kpis.activeSubscriptions} hint={`Trial ${data.kpis.trialingSubscriptions}`} accent="success" />
        <DashboardKpiTile label="Past due" value={data.kpis.pastDueSubscriptions} hint={`Overdue invoices ${data.kpis.overdueInvoices}`} accent={data.kpis.pastDueSubscriptions > 0 ? "warning" : "default"} />
        <DashboardKpiTile label="Collected (30d)" value={formatMinorCurrency(data.kpis.collectedLast30dMinor)} hint={`Billable seats ${data.kpis.activeBillableSeats}`} accent="success" />
        <DashboardKpiTile label="MRR (proxy)" value={formatMinorCurrency(revenueProxy.mrrProxyMinor)} hint="Last 30-day collection proxy" accent="info" />
        <DashboardKpiTile label="ARR (proxy)" value={formatMinorCurrency(revenueProxy.arrProxyMinor)} hint="MRR x 12 proxy" accent="info" />
        <DashboardKpiTile label="Trial to paid" value={`${revenueProxy.conversionRate}%`} hint="Active/(Active+Trialing)" accent={revenueProxy.conversionRate >= 60 ? "success" : "warning"} />
        <DashboardKpiTile label="System health" value={`${systemHealthScore}%`} hint="Delinquency and queue pressure" accent={systemHealthScore >= 80 ? "success" : "warning"} />
      </div>

      <div className="grid-3">
        <DashboardPanel title="Plan distribution" subtitle="Current plan mix by company">
          {data.planDistribution.length === 0 ? <p className="muted">No active plan records.</p> : null}
          {data.planDistribution.map((row) => (
            <SignalRow key={row.planCode} label={`${row.planName} (${row.planCode})`} value={row.companies} />
          ))}
        </DashboardPanel>

        <DashboardPanel title="Delinquency tracker" subtitle="Pending billing actions" tone="soft">
          <SignalRow label="Under review" value={data.kpis.pendingApprovals} tone={data.kpis.pendingApprovals > 0 ? "warning" : "success"} />
          <SignalRow label="Overdue invoices" value={data.kpis.overdueInvoices} tone={data.kpis.overdueInvoices > 0 ? "warning" : "success"} />
          <SignalRow label="Churn risk indicator" value={data.kpis.pastDueSubscriptions + data.kpis.overdueInvoices} tone={(data.kpis.pastDueSubscriptions + data.kpis.overdueInvoices) > 0 ? "warning" : "success"} />
          <SignalRow label="Snapshot generated" value={new Date(data.generatedAt).toLocaleString()} />
        </DashboardPanel>

        <DashboardPanel title="Audit activity heatmap" subtitle="Last 14 days immutable billing events" tone="spotlight">
          {auditHeatmap.length > 0 ? <MiniBarChart values={auditHeatmap} height={88} /> : null}
          <SignalRow label="Recent events" value={data.recentAudit.length} tone={data.recentAudit.length > 0 ? "info" : "default"} />
          <SignalRow label="Visibility" value="Platform-wide read-only" />
        </DashboardPanel>
      </div>

      <div className="grid-2">
        <DashboardPanel title="Revenue trend (queue snapshot)" subtitle="Recent invoice amounts currently in queue" tone="soft">
          {paymentQueueTrend.length > 0 ? <LineChart values={paymentQueueTrend} height={88} /> : <p className="muted">No queue trend data available.</p>}
          <SignalRow label="Queue size" value={data.paymentQueue.length} tone={data.paymentQueue.length > 0 ? "warning" : "success"} />
        </DashboardPanel>

        <DashboardPanel title="Recent audit events" subtitle="Global immutable billing audit feed" tone="soft">
          {data.recentAudit.length === 0 ? <p className="muted">No global audit events available.</p> : null}
          {data.recentAudit.slice(0, 6).map((event) => (
            <SignalRow
              key={`${event.companyId ?? "platform"}-${event.createdAt}-${event.eventType}`}
              label={`${event.eventType} (${event.entityType})`}
              value={`${event.companyName ?? "Platform"} | ${new Date(event.createdAt).toLocaleString()}`}
            />
          ))}
        </DashboardPanel>
      </div>

      <DashboardPanel title="Upcoming renewals (14 days)" subtitle="Subscription periods ending soon">
        {upcomingRenewals.length === 0 ? (
          <p className="muted">No renewals in the next 14 days.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Period End</th>
                  <th>Days Left</th>
                </tr>
              </thead>
              <tbody>
                {upcomingRenewals.map(({ company, periodEndMs }) => (
                  <tr key={company.companyId}>
                    <td>{company.companyName}</td>
                    <td>{company.planName ?? "-"}</td>
                    <td><StatusBadge status={company.subscriptionStatus} /></td>
                    <td>{new Date(periodEndMs).toLocaleDateString()}</td>
                    <td>{Math.max(0, Math.ceil((periodEndMs - Date.now()) / (1000 * 60 * 60 * 24)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel title="Pending payment queue" subtitle="Companies requiring billing follow-up">
        {data.paymentQueue.length === 0 ? (
          <p className="muted">No pending payment queue items.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Amount</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.paymentQueue.map((item) => (
                  <tr key={item.invoiceId}>
                    <td>{item.companyName}</td>
                    <td>{item.invoiceNumber}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>{item.dueDate}</td>
                    <td>{formatMinorCurrency(item.subtotalMinor, item.currencyCode)}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>

      <DashboardPanel title="Top growing companies (seat momentum proxy)" subtitle="Highest active billable seat counts">
        {topCompanies.length === 0 ? (
          <p className="muted">No company billing snapshots available.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Plan</th>
                  <th>Subscription</th>
                  <th>Seats</th>
                  <th>Latest Invoice</th>
                  <th>Last Payment</th>
                </tr>
              </thead>
              <tbody>
                {topCompanies.map((company) => (
                  <tr key={company.companyId}>
                    <td>
                      <strong>{company.companyName}</strong>
                      <div className="muted">{company.slug}</div>
                    </td>
                    <td>{company.planName ? `${company.planName} v${company.planVersion ?? "-"}` : "-"}</td>
                    <td><StatusBadge status={company.subscriptionStatus} /></td>
                    <td>
                      <strong>{company.billableSeats}</strong>
                      <div className="muted">Active {company.activeSeats}</div>
                    </td>
                    <td>
                      {company.latestInvoiceNumber ? (
                        <>
                          <div>{company.latestInvoiceNumber}</div>
                          <div className="muted">{company.latestInvoiceDueDate ?? "-"}</div>
                          {company.latestInvoiceStatus ? <StatusBadge status={company.latestInvoiceStatus} /> : null}
                        </>
                      ) : "-"}
                    </td>
                    <td>
                      {company.lastPaymentAt && company.lastPaidAmountMinor !== null ? (
                        <>
                          <div>{new Date(company.lastPaymentAt).toLocaleDateString()}</div>
                          <div className="muted">
                            {formatMinorCurrency(company.lastPaidAmountMinor, company.currencyCode ?? "PKR")}
                          </div>
                        </>
                      ) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>
    </PageContainer>
  );
};
