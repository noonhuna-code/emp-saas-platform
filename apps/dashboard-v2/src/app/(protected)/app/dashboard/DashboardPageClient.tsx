"use client";

import Link from "next/link";
import { Suspense, lazy, useMemo } from "react";
import { DashboardRoleFallback } from "@/components/dashboard/DashboardRoleFallback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups } from "@/navigation/navigation.config";
import { resolveDashboardCapabilities, resolveDashboardPersona } from "@/lib/dashboard/capabilities";

type DashboardPageClientProps = {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
};

const EmployeeDashboard = lazy(() =>
  import("@/components/dashboard/EmployeeDashboard").then((module) => ({ default: module.EmployeeDashboard }))
);
const ManagerDashboard = lazy(() =>
  import("@/components/dashboard/ManagerDashboard").then((module) => ({ default: module.ManagerDashboard }))
);
const TeamLeadDashboard = lazy(() =>
  import("@/components/dashboard/TeamLeadDashboard").then((module) => ({ default: module.TeamLeadDashboard }))
);
const AdminDashboard = lazy(() =>
  import("@/components/dashboard/AdminDashboard").then((module) => ({ default: module.AdminDashboard }))
);
const FounderDashboard = lazy(() =>
  import("@/components/dashboard/FounderDashboard").then((module) => ({ default: module.FounderDashboard }))
);
const FinanceDashboard = lazy(() =>
  import("@/components/dashboard/FinanceDashboard").then((module) => ({ default: module.FinanceDashboard }))
);

const normalizeRole = (value: string | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, "_")
    .replace(/\s+/g, "_");

export const DashboardPageClient = ({ role, permissions, hasEmployeeContext, entitlements }: DashboardPageClientProps) => {
  const persona = resolveDashboardPersona({ role, permissions });
  const caps = resolveDashboardCapabilities({ role, permissions });
  const normalizedRole = normalizeRole(role);
  const isTeamLeadRole =
    normalizedRole === "team_lead"
    || normalizedRole === "teamlead"
    || (permissions.includes("manage_attendance") && !permissions.includes("manage_employees"));
  const visibleGroups = useMemo(
    () =>
      resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, {
        permissions,
        hasEmployeeContext,
        entitlements,
        persona,
      }),
    [entitlements, hasEmployeeContext, permissions, persona]
  );
  const allowedRoutes = useMemo(
    () => {
      const routes = new Set(visibleGroups.flatMap((group) => group.items.map((item) => item.href)));

      if (hasEmployeeContext) {
        routes.add("/app/attendance/shift-swaps");
      }

      if (permissions.includes("manage_attendance")) {
        routes.add("/app/attendance/team");
        routes.add("/app/attendance/shift-swaps");
        routes.add("/app/leave/review");
      }

      if (permissions.includes("manage_employees")) {
        routes.add("/app/leave/review");
      }

      return [...routes];
    },
    [hasEmployeeContext, permissions, visibleGroups]
  );
  const adminOpsMode = useMemo(() => {
    if (
      normalizedRole === "it"
      || normalizedRole === "it_manager"
      || normalizedRole === "it_admin"
      || normalizedRole === "it_support"
      || (caps.has("view_it_dashboard") && !caps.has("view_admin_dashboard") && !caps.has("view_hr_dashboard"))
    ) {
      return "it" as const;
    }

    if (normalizedRole === "hr" || (caps.has("view_hr_dashboard") && !caps.has("view_admin_dashboard"))) {
      return "hr" as const;
    }

    return "admin" as const;
  }, [caps, normalizedRole]);
  const canViewTeamAttendance = permissions.includes("manage_attendance") && allowedRoutes.includes("/app/attendance");
  const canReviewLeave =
    (permissions.includes("manage_employees") || permissions.includes("manage_attendance"))
    && allowedRoutes.includes("/app/leave/review");

  const roleDashboard = useMemo(() => {
    switch (persona) {
      case "executive":
        return <FounderDashboard allowedRoutes={allowedRoutes} />;
      case "admin_ops":
        return <AdminDashboard mode={adminOpsMode} allowedRoutes={allowedRoutes} canReviewLeave={canReviewLeave} />;
      case "finance":
        return <FinanceDashboard allowedRoutes={allowedRoutes} />;
      case "manager":
        return isTeamLeadRole
          ? <TeamLeadDashboard allowedRoutes={allowedRoutes} canViewTeamAttendance={canViewTeamAttendance} canReviewLeave={canReviewLeave} />
          : <ManagerDashboard allowedRoutes={allowedRoutes} canViewTeamAttendance={canViewTeamAttendance} canReviewLeave={canReviewLeave} />;
      case "employee":
      default:
        return hasEmployeeContext
          ? <EmployeeDashboard allowedRoutes={allowedRoutes} />
          : <ManagerDashboard allowedRoutes={allowedRoutes} canViewTeamAttendance={canViewTeamAttendance} canReviewLeave={canReviewLeave} />;
    }
  }, [adminOpsMode, allowedRoutes, canReviewLeave, canViewTeamAttendance, hasEmployeeContext, isTeamLeadRole, persona]);

  if (persona === "platform_owner") {
    return (
      <div className="space-y-6">
        <Card className="rounded-3xl border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <CardHeader>
            <CardTitle>Platform oversight lives in the isolated platform shell</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <p>Use the dedicated platform workspace for cross-tenant governance, security, and subscription operations.</p>
            <Link href="/platform" className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900">
              Open platform shell
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Suspense fallback={<DashboardRoleFallback />}>{roleDashboard}</Suspense>;
};
