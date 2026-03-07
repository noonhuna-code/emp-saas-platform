"use client";

import Link from "next/link";
import { Suspense, lazy, useMemo } from "react";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import { DashboardRoleFallback } from "@/components/dashboard/DashboardRoleFallback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardPageClientProps = {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
};

const LazyAdminDashboard = lazy(() => import("@/components/dashboard/AdminDashboard").then((mod) => ({ default: mod.AdminDashboard })));
const LazyFinanceDashboard = lazy(() => import("@/components/dashboard/FinanceDashboard").then((mod) => ({ default: mod.FinanceDashboard })));
const LazyFounderDashboard = lazy(() => import("@/components/dashboard/FounderDashboard").then((mod) => ({ default: mod.FounderDashboard })));
const LazyHRDashboard = lazy(() => import("@/components/dashboard/HRDashboard").then((mod) => ({ default: mod.HRDashboard })));
const LazyITDashboard = lazy(() => import("@/components/dashboard/ITDashboard").then((mod) => ({ default: mod.ITDashboard })));
const LazyManagerDashboard = lazy(() => import("@/components/dashboard/ManagerDashboard").then((mod) => ({ default: mod.ManagerDashboard })));
const LazyTeamLeadDashboard = lazy(() => import("@/components/dashboard/TeamLeadDashboard").then((mod) => ({ default: mod.TeamLeadDashboard })));

export const DashboardPageClient = ({ role, permissions }: DashboardPageClientProps) => {
  const persona = resolveDashboardPersona({ role, permissions });

  const roleWorkspace = useMemo(() => {
    if (persona === "finance") {
      return <LazyFinanceDashboard />;
    }

    if (persona === "employee") {
      return <EmployeeDashboard />;
    }

    if (persona === "team_lead") {
      return <LazyTeamLeadDashboard />;
    }

    if (persona === "manager") {
      return <LazyManagerDashboard />;
    }

    if (persona === "hr") {
      return <LazyHRDashboard />;
    }

    if (persona === "it") {
      return <LazyITDashboard />;
    }

    if (persona === "admin") {
      return <LazyAdminDashboard />;
    }

    return <LazyFounderDashboard />;
  }, [persona]);

  if (persona === "platform_owner") {
    return (
      <div className="dashboard-shell fade-in">
        <Card>
          <CardHeader>
            <CardTitle>Platform Owner Workspace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Platform Owner access is isolated under the dedicated platform shell.
            </p>
            <Link href="/platform" className="secondary-btn">Open Platform Shell</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <Suspense fallback={<DashboardRoleFallback />}>{roleWorkspace}</Suspense>;
};
