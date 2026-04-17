"use client";
import { Badge } from "@/components/ui/badge";
import type { OrganizationDepartmentSummary, OrganizationOverview, OrganizationReportingSummary, OrganizationTeamSummary } from "@emp/lib/types";
import {
  DashboardRail,
  FeatureCallout,
  OverviewChips,
  PageContainer,
  PageHeader,
  StatePanel,
  StatCard,
  StatGrid,
  SurfacePanel,
  WorkspaceModuleGrid,
} from "@/components/dashboard-v2/PagePrimitives";
import { getOrganizationCapabilities } from "./organization-access";
import { OrganizationSectionNav } from "./OrganizationSectionNav";

const personLabel = (person?: { full_name: string; employee_code?: string | null } | null) => {
  if (!person) return "Not assigned";
  return person.employee_code ? `${person.full_name} (${person.employee_code})` : person.full_name;
};

const reportingMeta = (reporting: OrganizationReportingSummary[]) => {
  const direct = reporting.filter((line) => line.primary_manager).length;
  const dotted = reporting.reduce((total, line) => total + line.secondary_managers.length, 0);
  const managed = reporting.filter((line) => line.subordinate_count > 0).length;

  return { direct, dotted, managed };
};

const renderDepartmentCard = (department: OrganizationDepartmentSummary) => (
  <div
    key={department.id}
    className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">{department.name}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{department.code ?? "No code"}</div>
      </div>
      <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        {department.employee_count} people
      </Badge>
    </div>
    <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
      <div>Head: {personLabel(department.head)}</div>
      <div>Teams: {department.team_count}</div>
      <div>Parent: {department.parent_department_id ? "Nested department" : "Top-level department"}</div>
    </div>
  </div>
);

const renderTeamCard = (team: OrganizationTeamSummary) => (
  <div
    key={team.id}
    className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">{team.name}</div>
        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">Team / Unit</div>
      </div>
      <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
        {team.employee_count} assigned
      </Badge>
    </div>
    <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">Lead: {personLabel(team.lead)}</div>
  </div>
);

export function OrganizationOverviewScreen({
  overview,
  error,
  embedded = false,
  viewerRole = null,
  viewerPermissions = [],
}: {
  overview: OrganizationOverview | null;
  error?: string | null;
  embedded?: boolean;
  viewerRole?: string | null;
  viewerPermissions?: string[];
}) {
  const capabilities = getOrganizationCapabilities(viewerRole, viewerPermissions);
  if (error) {
    return (
      <PageContainer>
        {!embedded ? (
          <PageHeader
            eyebrow="Organization"
            title="Organization overview"
            description="The organization surface could not be loaded for this workspace."
            chips={["Structure", "Reporting", "Read-safe visibility"]}
          />
        ) : null}
        <StatePanel title="Unable to load organization data" description={error} />
      </PageContainer>
    );
  }

  if (!overview) {
    return (
      <PageContainer>
        {!embedded ? (
          <PageHeader
            eyebrow="Organization"
            title="Organization overview"
            description="Track departments, teams, reporting lines, and people coverage from one place."
            chips={["Departments", "Teams", "Reporting lines"]}
          />
        ) : null}
        <StatePanel
          title="No organization data yet"
          description="Departments, teams, and reporting relationships will appear here once your workspace has been configured."
        />
      </PageContainer>
    );
  }

  const { direct, dotted, managed } = reportingMeta(overview.reporting);
  const foundation = overview.foundation ?? null;

  return (
    <PageContainer>
      {!embedded ? <OrganizationSectionNav capabilities={capabilities} className="mb-6" /> : null}
      {!embedded ? (
        <PageHeader
          eyebrow="Organization"
          title="Company structure and reporting"
          description="Review departments, teams, reporting lines, heads, leads, and workforce coverage from one organization-aware summary."
          chips={["Departments", "Teams", "Reporting", foundation ? "Foundation ready" : "Overview only"]}
          actions={
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {overview.departments.length} departments
              </Badge>
              <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {overview.teams.length} teams
              </Badge>
              <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {overview.employees.length} employees
              </Badge>
            </div>
          }
        />
      ) : null}

      {!embedded ? (
        <SurfacePanel
          title="Organization routes"
          description="Move between overview, people, org chart, and the broader workspace without losing structure context."
        >
          <OverviewChips
            chips={[
              `${overview.departments.length} departments`,
              `${overview.teams.length} teams`,
              `${overview.employees.length} employees`,
              foundation ? "Foundation ready" : "Overview only",
            ]}
          />
          <div className="mt-4">
            <WorkspaceModuleGrid
              modules={[
                {
                  title: "People directory",
                  description: "Open the searchable employee directory when structure review turns into people lookup.",
                  href: "/app/people",
                  label: "People",
                  metric: `${overview.employees.length} employees`,
                  highlights: ["Profiles", "Managers", "Directory"],
                },
                {
                  title: "Org chart view",
                  description: "Switch to the relationship-first view for reporting and placement context.",
                  href: "/app/org-chart",
                  label: "Org chart",
                  metric: `${overview.teams.length} teams`,
                  highlights: ["Relationships", "Managers", "Placement"],
                },
                {
                  title: "Enterprise workspace",
                  description: "Return to the full organization workspace for structure, roles, and assignment administration.",
                  href: "/app/organization",
                  label: "Workspace",
                  highlights: ["Structure", "Assignments", "Governance"],
                },
              ]}
            />
          </div>
        </SurfacePanel>
      ) : null}

      {!embedded ? (
        <FeatureCallout
          badge="Organization layer"
          title="One operating structure for workforce visibility, reporting, and approval ownership."
          description="This workspace keeps structure, reporting coverage, and enterprise foundation signals in one calmer lane so leadership, HR, and administrators can understand the organization before opening deeper admin forms."
        />
      ) : null}

      <StatGrid>
        <StatCard label="Departments" value={overview.departments.length} hint="Top-level and nested structures" />
        <StatCard label="Teams / Units" value={overview.teams.length} hint="Execution-level operating units" />
        <StatCard label="Primary reporting lines" value={direct} hint="Using active direct-manager relations" />
        <StatCard label="Secondary reporting lines" value={dotted} hint="Dotted-line and specialist reviewers" />
      </StatGrid>

      {foundation ? (
        <StatGrid>
          <StatCard label="Org units" value={foundation.org_unit_count} hint="Enterprise structure records in the current model" />
          <StatCard label="Role families" value={foundation.role_family_count} hint="Shared role-group coverage across the company" />
          <StatCard label="Positions" value={foundation.position_count} hint="Position planning and occupancy coverage" />
          <StatCard label="Delegations / routing" value={foundation.approval_delegation_count + foundation.approval_routing_rule_count} hint="Approval delegation and routing coverage" />
        </StatGrid>
      ) : null}

      <DashboardRail className="xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <SurfacePanel
          title="Department structure"
          description="Department summaries, employee distribution, and department-head readiness."
        >
          {overview.departments.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {overview.departments.map(renderDepartmentCard)}
            </div>
          ) : (
            <StatePanel
              title="No departments configured"
              description="Department nodes will appear here once departments are created."
            />
          )}
        </SurfacePanel>

        <SurfacePanel
          title="Reporting readiness"
          description="Current manager coverage, secondary reporting, and leadership visibility."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Primary manager coverage</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{direct}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Employees with an active direct manager relationship.</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Secondary reporting</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{dotted}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Dotted-line, HR, payroll, and other non-primary relationships.</div>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Manager visibility</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{managed}</div>
              <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Employees currently managing at least one subordinate.</div>
            </div>
          </div>
        </SurfacePanel>
      </DashboardRail>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <SurfacePanel title="Teams and units" description="Team lead coverage and subordinate-ready units.">
          {overview.teams.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {overview.teams.map(renderTeamCard)}
            </div>
          ) : (
            <StatePanel title="No teams configured" description="Create teams or units to structure department execution." />
          )}
        </SurfacePanel>

        <SurfacePanel
          title="Subordinate coverage"
          description="Manager and team-lead coverage based on active reporting lines."
        >
          <div className="space-y-3">
            {overview.reporting
              .filter((entry) => entry.subordinate_count > 0)
              .slice(0, 8)
              .map((entry) => (
                <div
                  key={entry.employee_id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">
                        {personLabel(entry.primary_manager)}
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {entry.subordinate_count} subordinate{entry.subordinate_count === 1 ? "" : "s"}
                      </div>
                    </div>
                    <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      {entry.secondary_managers.length} secondary links
                    </Badge>
                  </div>
                </div>
              ))}
            {overview.reporting.every((entry) => entry.subordinate_count === 0) ? (
              <StatePanel
                title="No subordinate listings yet"
                description="Once managers and team leads have reports assigned, subordinate-ready summaries will appear here."
              />
            ) : null}
          </div>
        </SurfacePanel>
      </div>

      {foundation ? (
        <DashboardRail className="xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
          <SurfacePanel
            title="Enterprise structure layer"
            description="The broader organization model that supports offices, departments, teams, positions, and approval ownership."
          >
            <div className="grid gap-3 md:grid-cols-2">
              {foundation.unit_category_counts.map((entry) => (
                <div
                  key={entry.category}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{entry.category}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">{entry.count}</div>
                  <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Mapped enterprise unit records</div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              Legacy mapped units: {foundation.mapped_legacy_unit_count}. Active position assignments: {foundation.active_assignment_count}. Supported reporting relations: {foundation.supported_relation_types.length}.
            </div>
          </SurfacePanel>

          <SurfacePanel
            title="Role-family coverage"
            description="Role-family coverage available for positions, approvals, and shared organizational planning."
          >
            <div className="space-y-3">
              {foundation.role_families.slice(0, 10).map((family) => (
                <div
                  key={family.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950 dark:text-slate-100">{family.name}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{family.key}</div>
                    </div>
                    <Badge className="rounded-full border-slate-200 bg-white/90 text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      {family.role_count} roles
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </SurfacePanel>
        </DashboardRail>
      ) : null}
    </PageContainer>
  );
}
