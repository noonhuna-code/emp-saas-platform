"use client";

import Link from "next/link";
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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

export const HRDashboard = ({
  allowedRoutes = [],
  canReviewLeave = false,
}: {
  allowedRoutes?: string[];
  canReviewLeave?: boolean;
}) => {
  const [view, setView] = useState<DashboardView>("workspace");
  const perf = useDashboardPerf("hr");
  const allowedRouteSet = useMemo(() => new Set(allowedRoutes), [allowedRoutes]);

  const heroActions = [
    allowedRouteSet.has("/app/payroll") ? { href: "/app/payroll", label: "Payroll Runs", tone: "primary" as const } : null,
    allowedRouteSet.has("/app/payslips") ? { href: "/app/payslips", label: "Payslips", tone: "secondary" as const } : null,
    canReviewLeave ? { href: "/app/leave/review", label: "Leave Review", tone: "secondary" as const } : null,
  ].filter(Boolean) as Array<{ href: string; label: string; tone: "primary" | "secondary" }>;

  const hrActions = [
    allowedRouteSet.has("/app/employees") ? { label: "Employee records", href: "/app/employees", caption: "Profiles and hierarchy" } : null,
    canReviewLeave ? { label: "Leave review", href: "/app/leave/review", caption: "Queues and coverage" } : null,
    allowedRouteSet.has("/app/payroll") ? { label: "Payroll runs", href: "/app/payroll", caption: "Run readiness" } : null,
    allowedRouteSet.has("/app/resources") ? { label: "Knowledge / SOPs", href: "/app/resources", caption: "Policies and guides" } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; caption: string }>;

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
        subtitle="Switch between workforce operations, trend visibility, and HR queue management from one role-aware shell."
      />

      <DashboardSection visible={view === "workspace"}>
        <section className="space-y-4">
          <HRKpiWidget />
        </section>

        <section className="space-y-4">
          <Suspense fallback={<div className="grid-3"><SkeletonCard rows={5} /><SkeletonChart /><SkeletonCard rows={6} /></div>}>
            <DashboardWidgetBoundary title="HR operations" message="HR operational widgets are temporarily unavailable.">
              <HROperationsWidget allowedRoutes={allowedRoutes} />
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
                  <HROperationsWidget allowedRoutes={allowedRoutes} />
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
                <HRTimelineWidget allowedRoutes={allowedRoutes} />
              </DashboardWidgetBoundary>
            </Suspense>
          </WorkflowPanel>
          <WorkflowPanel title="HR action paths" subtitle="High-frequency routes for people ops, payroll, and policy delivery">
            <QuickActionGrid actions={hrActions} />
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
