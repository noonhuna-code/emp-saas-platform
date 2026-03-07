"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardPerfMarker, useDashboardPerf } from "@/components/dashboard/useDashboardPerf";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
import {
  ChartPanel,
  DashboardHero,
  DashboardModeSwitch,
  DashboardPanel,
  DashboardSection,
  WorkflowPanel,
  type DashboardView
} from "@/components/dashboard/DashboardPrimitives";
import { SkeletonCard, SkeletonChart, SkeletonList } from "@/components/ui/SkeletonBlocks";
import HRKpiWidget from "@/components/dashboard/widgets/HRKpiWidget";

const HROperationsWidget = lazy(() => import("@/components/dashboard/widgets/HROperationsWidget"));
const HRTimelineWidget = lazy(() => import("@/components/dashboard/widgets/HRTimelineWidget"));

export const HRDashboard = () => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("hr");

  useEffect(() => {
    perf.markKpiRendered();
  }, [perf]);

  const activityItems = useMemo(
    () => [
      {
        id: "hr-1",
        title: "Payroll cycle status refreshed",
        description: "Latest payroll run and payout status synchronized.",
        timestamp: "Now"
      },
      {
        id: "hr-2",
        title: "Leave queue changed",
        description: "New leave requests entered review queue.",
        timestamp: "5 min ago"
      },
      {
        id: "hr-3",
        title: "Onboarding checklist updated",
        description: "Employee profile/document checklist has new pending tasks.",
        timestamp: "11 min ago"
      }
    ],
    []
  );

  return (
    <div className="page-wrap space-y-8 fade-in">
      <DashboardHero
        eyebrow="HR Workspace"
        title="Payroll and workforce operations"
        subtitle="Read-only payroll run lifecycle monitoring and workforce ops throughput for HR teams."
        emphasis="operations"
        actions={(
          <>
            <Link href="/app/payroll" className="primary-btn">Payroll Runs</Link>
            <Link href="/app/payslips" className="secondary-btn">Payslips</Link>
            <Link href="/app/leave/review" className="secondary-btn">Leave Review</Link>
          </>
        )}
      />

      <DashboardModeSwitch value={view} onChange={setView} />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <HRKpiWidget />
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-3"><SkeletonCard rows={5} /><SkeletonChart /><SkeletonCard rows={6} /></div>}>
            <DashboardWidgetBoundary title="HR operations" message="HR operational widgets are temporarily unavailable.">
              <HROperationsWidget />
            </DashboardWidgetBoundary>
          </Suspense>
        </section>
      </DashboardSection>

      <DashboardSection visible={view === "analytics"}>
        <ChartPanel title="HR analytics" subtitle="Payroll throughput, delivery quality, and policy trends">
          <Suspense fallback={<div className="grid-3"><SkeletonCard rows={5} /><SkeletonChart /><SkeletonCard rows={6} /></div>}>
            <DashboardWidgetBoundary title="HR analytics" message="Analytics are temporarily unavailable.">
              <>
                <DashboardPerfMarker onReady={perf.markChartsLoaded} />
                <HROperationsWidget />
              </>
            </DashboardWidgetBoundary>
          </Suspense>
        </ChartPanel>
      </DashboardSection>

      <DashboardSection visible={view === "operations"}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <WorkflowPanel title="Workflow timeline" subtitle="HR queue and lifecycle events">
            <Suspense fallback={<div className="grid-2"><SkeletonList rows={6} /><SkeletonList rows={8} /></div>}>
              <DashboardWidgetBoundary title="Workflow timeline" message="Workflow timeline is temporarily unavailable.">
                <HRTimelineWidget />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="Activity feed" subtitle="Recent HR operations">
            <ActivityFeed items={activityItems} />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Rendering mode" subtitle="Progressive dashboard hydration active">
          <p className="muted">
            HR KPIs render immediately while payroll and workflow sections continue loading in independent boundaries.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};
