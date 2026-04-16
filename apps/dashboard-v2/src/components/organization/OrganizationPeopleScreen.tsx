"use client";

import { useMemo, useState } from "react";
import type { OrganizationAdminData, OrganizationOverview } from "@emp/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatePanel,
  StatCard,
  StatGrid,
  SurfacePanel,
  WorkspaceModuleGrid,
} from "@/components/dashboard-v2/PagePrimitives";
import { adminInputClassName, AdminTable } from "./OrganizationAdminPrimitives";
import { getOrganizationCapabilities } from "./organization-access";

type PeopleRow = {
  id: string;
  name: string;
  employeeCode?: string | null;
  designation?: string | null;
  employmentStatus?: string | null;
  departmentName: string;
  teamName: string;
  managerName: string;
  roleFamilyName: string;
};

const bySearch = (value: string, query: string) => {
  if (!query.trim()) return true;
  return value.toLowerCase().includes(query.trim().toLowerCase());
};

export function OrganizationPeopleScreen({
  overview,
  adminData,
  error,
  role,
  permissions,
  employeeId,
}: {
  overview: OrganizationOverview | null;
  adminData: OrganizationAdminData | null;
  error?: string | null;
  role: string | null;
  permissions: string[];
  employeeId?: string | null;
}) {
  const capabilities = getOrganizationCapabilities(role, permissions);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [scope, setScope] = useState<"all" | "my-team">("all");

  const reportingMap = useMemo(
    () => new Map((overview?.reporting ?? []).map((entry) => [entry.employee_id, entry])),
    [overview?.reporting]
  );
  const departmentMap = useMemo(
    () => new Map((overview?.departments ?? []).map((entry) => [entry.id, entry.name])),
    [overview?.departments]
  );
  const teamMap = useMemo(
    () => new Map((overview?.teams ?? []).map((entry) => [entry.id, entry.name])),
    [overview?.teams]
  );
  const assignmentMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of adminData?.assignment_snapshot ?? []) {
      if (!map.has(row.employee_id) && row.role_family_name) {
        map.set(row.employee_id, row.role_family_name);
      }
    }
    return map;
  }, [adminData?.assignment_snapshot]);

  const myTeamIds = useMemo(() => {
    if (!employeeId || !overview) return new Set<string>();
    return new Set(
      overview.reporting
        .filter((entry) => entry.primary_manager?.id === employeeId)
        .map((entry) => entry.employee_id)
    );
  }, [employeeId, overview]);

  const rows = useMemo<PeopleRow[]>(() => {
    if (!overview) return [];
    return overview.employees.map((employee) => {
      const reporting = reportingMap.get(employee.id);
      return {
        id: employee.id,
        name: employee.full_name,
        employeeCode: employee.employee_code,
        designation: employee.designation,
        employmentStatus: employee.employment_status,
        departmentName: employee.department_id ? departmentMap.get(employee.department_id) ?? "Unassigned" : "Unassigned",
        teamName: employee.team_id ? teamMap.get(employee.team_id) ?? "No team" : "No team",
        managerName: reporting?.primary_manager?.full_name ?? "No manager",
        roleFamilyName: assignmentMap.get(employee.id) ?? "Not mapped",
      };
    });
  }, [assignmentMap, departmentMap, overview, reportingMap, teamMap]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (departmentId && overview?.employees.find((employee) => employee.id === row.id)?.department_id !== departmentId) return false;
      if (teamId && overview?.employees.find((employee) => employee.id === row.id)?.team_id !== teamId) return false;
      if (scope === "my-team" && myTeamIds.size > 0 && !myTeamIds.has(row.id)) return false;
      return bySearch(
        [row.name, row.employeeCode, row.designation, row.departmentName, row.teamName, row.managerName, row.roleFamilyName]
          .filter(Boolean)
          .join(" "),
        search
      );
    });
  }, [departmentId, myTeamIds, overview?.employees, rows, scope, search, teamId]);
  const workspaceModules = [
    {
      title: "People directory",
      description: "Stay in the verified directory view for scoped employee reads, reporting visibility, and workforce search.",
      href: "/app/people",
      label: "Directory",
      metric: `${filteredRows.length} visible`,
      highlights: ["Reporting lines", "Scoped reads", scope === "my-team" ? "My team" : "Company scope"],
    },
    {
      title: "Organization workspace",
      description: "Move into the broader organization workspace when structure, units, and governance context matter.",
      href: "/app/organization",
      label: "Structure",
      metric: `${overview?.departments.length ?? 0} departments`,
      highlights: ["Org model", "Units", "Governance"],
    },
    {
      title: "Org chart view",
      description: "Open the graph-first organization view when relationship and reporting visibility matter more than tabular search.",
      href: "/app/org-chart",
      label: "Relationships",
      metric: `${overview?.teams.length ?? 0} teams`,
      highlights: ["Org chart", "Managers", "Placement"],
    },
  ];

  if (!capabilities.canViewPeople) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="People"
          title="People directory"
          description="This route is available when the workspace grants organization or people visibility."
          chips={["Role-aware visibility", "Scoped employee reads", "Directory only"]}
        />
        <StatePanel
          title="No people-directory access"
          description="Your current workspace role does not include organization or people-directory visibility."
        />
      </PageContainer>
    );
  }

  if (!overview) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="People"
          title="People directory"
          description="Read the current workforce directory with department, team, reporting, and assignment context."
          chips={["Directory", "Reporting aware", "Read-safe org context"]}
        />
        <StatePanel
          title="People data is not available"
          description={error ?? "The current backend contract does not expose directory data for this role yet."}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="People"
        title="People directory"
        description="Review employee records, reporting context, department placement, and role-family coverage from one organization-aware directory."
        chips={["Employee records", "Reporting lines", "Scoped org visibility", scope === "my-team" ? "My team view" : "Company scope"]}
      />

      <FeatureCallout
        badge="Verified visibility"
        title="People access follows verified role and organization scope."
        description="This directory is designed around the scoped-read foundation already verified in backend services. It helps managers, HR, and enterprise readers stay inside approved org visibility without widening into sensitive profile surfaces."
      />

      <StatGrid>
        <StatCard label="Employees" value={overview.employees.length} hint="Visible in the current company scope" />
        <StatCard label="Departments" value={overview.departments.length} hint="Department coverage in this workspace" />
        <StatCard label="Teams" value={overview.teams.length} hint="Team and unit footprint" />
        <StatCard
          label="My team"
          value={myTeamIds.size}
          hint={capabilities.isManagerial ? "Direct reports from current reporting lines" : "Shown when manager scope is available"}
        />
      </StatGrid>

      <SurfacePanel
        title="Workspace modules"
        description="TailAdmin-style directory modules for people search, structure context, and relationship visibility."
      >
        <WorkspaceModuleGrid modules={workspaceModules} />
      </SurfacePanel>

      <SurfacePanel
        title="Directory filters"
        description="Use practical filters to move between executive review, admin coverage, and manager team visibility."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search</span>
            <input
              className={adminInputClassName}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people, role, department, or manager"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Department</span>
            <select className={adminInputClassName} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">All departments</option>
              {overview.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Team</span>
            <select className={adminInputClassName} value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              <option value="">All teams</option>
              {overview.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Scope</span>
            <select className={adminInputClassName} value={scope} onChange={(event) => setScope(event.target.value as "all" | "my-team")}>
              <option value="all">Company scope</option>
              <option value="my-team">My team</option>
            </select>
          </label>
        </div>
      </SurfacePanel>

      <SurfacePanel
        title="Directory view"
        description="Compact people coverage with reporting, placement, and assignment context."
        actions={
          <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700">
            {filteredRows.length} visible
          </Badge>
        }
      >
        {filteredRows.length > 0 ? (
          <AdminTable headers={["Employee", "Role / Position", "Department", "Team", "Manager", "Status"]}>
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{row.name}</div>
                  <div className="text-xs text-slate-500">{row.employeeCode ?? "No employee code"}</div>
                </td>
                <td className="px-4 py-3">
                  <div>{row.designation ?? "No designation"}</div>
                  <div className="text-xs text-slate-500">{row.roleFamilyName}</div>
                </td>
                <td className="px-4 py-3">{row.departmentName}</td>
                <td className="px-4 py-3">{row.teamName}</td>
                <td className="px-4 py-3">{row.managerName}</td>
                <td className="px-4 py-3">{row.employmentStatus ?? "Unknown"}</td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <StatePanel
            title="No people match the current filters"
            description="Try a wider department, team, or search scope."
          />
        )}
      </SurfacePanel>
    </PageContainer>
  );
}
