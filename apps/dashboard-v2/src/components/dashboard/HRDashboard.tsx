"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useState } from "react";
import { DashboardPerfMarker, useDashboardPerf } from "@/components/dashboard/useDashboardPerf";
import { DashboardWidgetBoundary } from "@/components/dashboard/DashboardWidgetBoundary";
import {
  ChartPanel,
  DashboardHero,
  DashboardModeSwitch,
  DashboardPanel,
  QuickActionGrid,
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

      <DashboardModeSwitch
        value={view}
        onChange={setView}
        title="Workspace lenses"
        subtitle="Switch between workforce operations, trend visibility, and HR queue management from one role-aware shell."
      />

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
          <WorkflowPanel title="HR action paths" subtitle="High-frequency routes for people ops, payroll, and policy delivery">
            <QuickActionGrid
              actions={[
                { label: "Employee records", href: "/app/employees", caption: "Profiles and hierarchy" },
                { label: "Leave review", href: "/app/leave/review", caption: "Queues and coverage" },
                { label: "Payroll runs", href: "/app/payroll", caption: "Run readiness" },
                { label: "Knowledge / SOPs", href: "/app/resources", caption: "Policies and guides" }
              ]}
            />
          </WorkflowPanel>
        </div>

        <DashboardPanel title="Operating scope" subtitle="What HR can act on from this surface">
          <p className="muted">
            HR stays anchored to workforce records, leave governance, payroll readiness, and the policy workflows that affect people operations every day.
          </p>
        </DashboardPanel>
      </DashboardSection>
    </div>
  );
};
