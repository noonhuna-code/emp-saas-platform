"use client";

import Link from "next/link";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { EmployeeDashboard } from "@/components/dashboard/EmployeeDashboard";
import { FinanceDashboard } from "@/components/dashboard/FinanceDashboard";
import { FounderDashboard } from "@/components/dashboard/FounderDashboard";
import { HRDashboard } from "@/components/dashboard/HRDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { TeamLeadDashboard } from "@/components/dashboard/TeamLeadDashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardPageClientProps = {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
};

const hasAnyPermission = (permissions: string[], checks: string[]): boolean =>
  checks.some((permission) => permissions.includes(permission));

export const DashboardPageClient = ({ role, permissions }: DashboardPageClientProps) => {
  const persona = resolveDashboardPersona({ role, permissions });
  const financePersona =
    persona === "employee" &&
    hasAnyPermission(permissions, ["manage_billing", "approve_billing_payments"]) &&
    !hasAnyPermission(permissions, ["view_all_companies", "view_global_audit"]);

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

  if (financePersona) {
    return <FinanceDashboard />;
  }

  if (persona === "employee") {
    return <EmployeeDashboard />;
  }

  if (persona === "team_lead") {
    return <TeamLeadDashboard />;
  }

  if (persona === "manager") {
    return <ManagerDashboard />;
  }

  if (persona === "hr") {
    return <HRDashboard />;
  }

  if (persona === "admin") {
    return <AdminDashboard />;
  }

  return <FounderDashboard />;
};
