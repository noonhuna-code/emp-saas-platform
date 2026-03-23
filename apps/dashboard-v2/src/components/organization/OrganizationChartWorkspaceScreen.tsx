"use client";

import { useMemo, useState } from "react";
import type { OrganizationOverview } from "@emp/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  DashboardRail,
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatePanel,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { adminInputClassName } from "./OrganizationAdminPrimitives";
import { OrganizationSectionNav } from "./OrganizationSectionNav";
import { getOrganizationCapabilities } from "./organization-access";

const matches = (value: string, query: string) => {
  if (!query.trim()) return true;
  return value.toLowerCase().includes(query.trim().toLowerCase());
};

export function OrganizationChartWorkspaceScreen({
  overview,
  error,
  role,
  permissions,
}: {
  overview: OrganizationOverview | null;
  error?: string | null;
  role: string | null;
  permissions: string[];
}) {
  const capabilities = getOrganizationCapabilities(role, permissions);
  const [search, setSearch] = useState("");

  const departmentCards = useMemo(() => {
    if (!overview) return [];

    return overview.departments
      .map((department) => {
        const teams = overview.teams.filter((team) => team.department_id === department.id);
        const people = overview.employees.filter((employee) => employee.department_id === department.id);
        return {
          ...department,
          teams,
          people,
        };
      })
      .filter((department) =>
        matches(
          [
            department.name,
            department.head?.full_name,
            ...department.teams.map((team) => team.name),
            ...department.people.map((person) => person.full_name),
          ]
            .filter(Boolean)
            .join(" "),
          search
        )
      );
  }, [overview, search]);

  const treeStats = useMemo(() => {
    if (!overview) {
      return { departmentNodes: 0, teamNodes: 0, employeeNodes: 0, reportingEdges: 0 };
    }
    return {
      departmentNodes: overview.tree.nodes.filter((node) => node.type === "department").length,
      teamNodes: overview.tree.nodes.filter((node) => node.type === "team").length,
      employeeNodes: overview.tree.nodes.filter((node) => node.type === "employee").length,
      reportingEdges: overview.tree.edges.filter((edge) => edge.edge_type === "reporting").length,
    };
  }, [overview]);

  if (!capabilities.canViewOrgChart) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Org chart"
          title="Organization map"
          description="This route is available when the workspace grants organization visibility."
          chips={["Structure map", "Read-safe org context", "Role gated"]}
          actions={<OrganizationSectionNav capabilities={capabilities} />}
        />
        <StatePanel
          title="No org-chart access"
          description="Your current workspace role does not include organization visibility."
        />
      </PageContainer>
    );
  }

  if (!overview) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Org chart"
          title="Organization map"
          description="Review departments, teams, reporting relationships, and role coverage from one org-aware view."
          chips={["Departments", "Teams", "Reporting links"]}
          actions={<OrganizationSectionNav capabilities={capabilities} />}
        />
        <StatePanel
          title="Organization map is not available"
          description={error ?? "The current backend contract does not expose org-chart data for this role yet."}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Org chart"
        title="Organization map"
        description="Read the current organization structure as departments, teams, leaders, and reporting coverage without dropping into admin forms."
        chips={["Departments", "Teams", "Reporting", "Scoped visibility"]}
        actions={<OrganizationSectionNav capabilities={capabilities} />}
      />

      <FeatureCallout
        badge="Org clarity"
        title="A calmer map for how structure, leaders, and reporting fit together."
        description="This view is meant for fast structural understanding: who leads which unit, where teams sit, and how reporting coverage is wired, all without widening into admin-only controls."
      />

      <StatGrid>
        <StatCard label="Departments" value={treeStats.departmentNodes} hint="Department nodes in the current tree" />
        <StatCard label="Teams / units" value={treeStats.teamNodes} hint="Execution-level units in the tree" />
        <StatCard label="People nodes" value={treeStats.employeeNodes} hint="Employees represented in the tree" />
        <StatCard label="Reporting links" value={treeStats.reportingEdges} hint="Direct and secondary reporting edges" />
      </StatGrid>

      <DashboardRail className="xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SurfacePanel
          title="Department and team map"
          description="A compact org-chart-ready view of heads, leads, team footprint, and employee distribution."
          actions={
            <input
              className={`${adminInputClassName} w-[240px]`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search departments, teams, or people"
            />
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {departmentCards.length > 0 ? (
              departmentCards.map((department) => (
                <div key={department.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold tracking-tight text-slate-950">{department.name}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        Head: {department.head?.full_name ?? "Not assigned"}
                      </div>
                    </div>
                    <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700">
                      {department.employee_count} people
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3">
                    {department.teams.length > 0 ? (
                      department.teams.map((team) => (
                        <div
                          key={team.id}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{team.name}</div>
                              <div className="text-xs text-slate-500">
                                Lead: {team.lead?.full_name ?? "Not assigned"}
                              </div>
                            </div>
                            <span className="text-xs font-medium text-slate-500">
                              {team.employee_count} assigned
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                        No teams or units mapped yet.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <StatePanel
                title="No org nodes match the current search"
                description="Try a broader query to see departments, teams, and reporting coverage."
              />
            )}
          </div>
        </SurfacePanel>

        <SurfacePanel
          title="Reporting signals"
          description="Quick checks for how the structure is behaving from a leadership, HR, or admin point of view."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Primary reporting</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {overview.reporting.filter((entry) => entry.primary_manager).length}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Employees with a primary manager relationship in the current structure.
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Secondary reporting</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {overview.reporting.reduce((sum, entry) => sum + entry.secondary_managers.length, 0)}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Dotted-line, approval, HR, payroll, and matrix reporting links.
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Managers with reports</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {overview.reporting.filter((entry) => entry.subordinate_count > 0).length}
              </div>
              <div className="mt-1 text-sm text-slate-600">
                Useful for executive review, HR checks, and manager-coverage planning.
              </div>
            </div>
          </div>
        </SurfacePanel>
      </DashboardRail>
    </PageContainer>
  );
}
