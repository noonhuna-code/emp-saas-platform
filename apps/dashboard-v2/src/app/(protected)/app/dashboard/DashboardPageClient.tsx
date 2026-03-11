"use client";

import Link from "next/link";
import { RoleHomeFoundation } from "@/components/dashboard-v2/RoleHomeFoundation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";

type DashboardPageClientProps = {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
};

export const DashboardPageClient = ({ role, permissions }: DashboardPageClientProps) => {
  const persona = resolveDashboardPersona({ role, permissions });

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

  return <RoleHomeFoundation persona={persona} />;
};
