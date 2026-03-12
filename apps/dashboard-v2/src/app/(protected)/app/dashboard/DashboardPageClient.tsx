"use client";

import Link from "next/link";
import { Suspense, lazy, useMemo } from "react";
import { DashboardRoleFallback } from "@/components/dashboard/DashboardRoleFallback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";

type DashboardPageClientProps = {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
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
const HRDashboard = lazy(() =>
  import("@/components/dashboard/HRDashboard").then((module) => ({ default: module.HRDashboard }))
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
const ITDashboard = lazy(() =>
  import("@/components/dashboard/ITDashboard").then((module) => ({ default: module.ITDashboard }))
);

export const DashboardPageClient = ({ role, permissions, hasEmployeeContext }: DashboardPageClientProps) => {
  const persona = resolveDashboardPersona({ role, permissions });

  const roleDashboard = useMemo(() => {
    switch (persona) {
      case "founder":
        return <FounderDashboard />;
      case "admin":
        return <AdminDashboard />;
      case "hr":
        return <HRDashboard />;
      case "finance":
        return <FinanceDashboard />;
      case "it":
        return <ITDashboard />;
      case "manager":
        return <ManagerDashboard />;
      case "team_lead":
        return <TeamLeadDashboard />;
      case "employee":
      default:
        return hasEmployeeContext ? <EmployeeDashboard /> : <ManagerDashboard />;
    }
  }, [hasEmployeeContext, persona]);

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
