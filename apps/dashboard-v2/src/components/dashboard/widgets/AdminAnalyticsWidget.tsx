"use client";

import { useEffect, useState } from "react";
import { PayrollAnalyticsWidgetsSection } from "@/components/dashboard/payroll-analytics/PayrollAnalyticsWidgetsSection";
import { DashboardPanel } from "@/components/dashboard/DashboardPrimitives";
import { SkeletonChart } from "@/components/ui/SkeletonBlocks";
import { isFeatureEnabled } from "@/lib/client/entitlements";
import { loadBillingOverviewData } from "@/components/dashboard/widgets/dashboard-data-loaders";

export default function AdminAnalyticsWidget() {
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<Awaited<ReturnType<typeof loadBillingOverviewData>>>(null);

  useEffect(() => {
    let active = true;

    void loadBillingOverviewData()
      .then((data) => {
        if (!active) return;
        setBillingData(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <SkeletonChart />;
  }

  const analyticsStandardEnabled = isFeatureEnabled(billingData?.entitlements, "feature.analytics_standard");
  const analyticsAdvancedEnabled = isFeatureEnabled(billingData?.entitlements, "feature.analytics_advanced");

  if (!(analyticsStandardEnabled || analyticsAdvancedEnabled)) {
    return (
      <DashboardPanel title="Payroll analytics" subtitle="Feature not enabled in current plan" tone="soft">
        <p className="muted">Enable analytics entitlements to access payroll trend and growth widgets.</p>
      </DashboardPanel>
    );
  }

  return (
    <PayrollAnalyticsWidgetsSection
      title="Payroll analytics"
      subtitle="Admin read-only payroll trends, delivery outcomes, growth, and closeout timing"
    />
  );
}
