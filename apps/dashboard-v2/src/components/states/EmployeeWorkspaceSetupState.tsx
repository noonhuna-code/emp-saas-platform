"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";

export const isEmployeeWorkspaceSetupIssue = (message?: string | null): boolean => {
  const normalized = (message ?? "").trim().toLowerCase();
  return normalized.includes("employee record not found") || normalized.includes("permission denied");
};

export const EmployeeWorkspaceSetupState = ({
  title,
  description,
  homeHref = "/app/dashboard",
}: {
  title: string;
  description: string;
  homeHref?: string;
}) => (
  <SurfacePanel title={title} description={description} tone="subtle">
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <p>
          This signed-in account can access the shell, but the employee-linked self-service record is not fully available
          for this route yet.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link
          href={homeHref}
          className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
        <Link
          href="/app/settings"
          className="inline-flex h-10 items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-4 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
        >
          Open settings
        </Link>
      </div>
    </div>
  </SurfacePanel>
);
