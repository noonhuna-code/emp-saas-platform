"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fetchEmployees } from "@/lib/client/api";
import type { EmployeeDirectoryRow } from "@/lib/types/employees";
import { EmployeeFilters } from "./EmployeeFilters";
import { EmployeeTable } from "./EmployeeTable";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import {
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
  WorkspaceModuleGrid,
} from "@/components/dashboard-v2/PagePrimitives";

export const EmployeeDirectoryScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<EmployeeDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(searchQuery);

  const requestQuery = useMemo(() => ({
    query: deferredQuery.trim() || undefined,
    departmentId: departmentId || undefined,
    status: status || undefined,
    page: 1,
    pageSize: 25
  }), [deferredQuery, departmentId, status]);
  const filteredStats = useMemo(() => ({
    active: rows.filter((row) => (row.employment_status ?? "").toLowerCase() === "active").length,
    suspended: rows.filter((row) => (row.employment_status ?? "").toLowerCase() === "suspended").length,
    levels: new Set(rows.map((row) => row.job_level).filter(Boolean)).size,
  }), [rows]);
  const workspaceModules = [
    {
      title: "Employee directory",
      description: "Stay in the searchable company directory for role-aware people lookup, status review, and record entry points.",
      href: "/app/employees",
      label: "Directory",
      metric: `${total} total`,
      highlights: ["Search", "People", "Company scope"],
    },
    {
      title: "People explorer",
      description: "Use the organization-aware people explorer when reporting lines and structural context matter more than raw directory search.",
      href: "/app/people",
      label: "Explorer",
      metric: `${rows.length} visible`,
      highlights: ["Reporting", "Structure", "Scoped reads"],
    },
    {
      title: "Organization workspace",
      description: "Open the larger organization control surface when changes or reviews need unit-level context.",
      href: "/app/organization",
      label: "Org",
      metric: status || "All statuses",
      highlights: ["Org model", "Assignments", "Governance"],
    },
  ];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchEmployees(requestQuery)
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load employees");
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(result.data.rows);
        setTotal(result.data.total);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load employees");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestQuery]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Employees"
        title="Employee directory"
        description="Company-scoped directory with server-backed search for people, employee codes, statuses, and job levels."
        chips={["Directory", "Server-backed search", "People records", "Role-aware access"]}
      />

      <FeatureCallout
        badge="Directory lane"
        title="Keep people search fast, readable, and linked to the rest of the Workforce OS."
        description="This directory is now aligned with the same premium dashboard system as the rest of the protected app, so search, review, and navigation stay consistent across roles and screen sizes."
      />

      <StatGrid>
        <StatCard label="Total visible" value={total} hint="Rows available for the current query and company scope" />
        <StatCard label="Active" value={filteredStats.active} hint="Active employees in the current page result" />
        <StatCard label="Suspended" value={filteredStats.suspended} hint="Suspended employees in the current page result" />
        <StatCard label="Job levels" value={filteredStats.levels} hint="Distinct levels represented in the visible rows" />
      </StatGrid>

      <SurfacePanel
        title="Workspace modules"
        description="TailAdmin-style directory modules for company search, people explorer, and organization context."
      >
        <WorkspaceModuleGrid modules={workspaceModules} />
      </SurfacePanel>

      <SurfacePanel
        title="Directory filters"
        description="Search by person, narrow by department and status, and keep the result set easy to read on all devices."
      >
        <EmployeeFilters
          query={searchQuery}
          departmentId={departmentId}
          status={status}
          onQueryChange={setSearchQuery}
          onDepartmentIdChange={setDepartmentId}
          onStatusChange={setStatus}
        />
      </SurfacePanel>

      {loading ? <LoadingState label={deferredQuery.trim() ? "Searching employees..." : "Loading employees..."} /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No employees found"
          subtitle={deferredQuery.trim()
            ? "Try a broader person search or adjust the department and status filters."
            : "Adjust filters or verify company permissions in the auth context resolver."}
        />
      ) : null}
      {!loading && !error && rows.length > 0 ? (
        <SurfacePanel
          title="Directory results"
          description="Review the visible employee result set and open individual records without leaving the directory workspace."
        >
          <EmployeeTable rows={rows} />
        </SurfacePanel>
      ) : null}
    </PageContainer>
  );
};
