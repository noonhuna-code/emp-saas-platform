import {
  OrganizationDepartmentSummary,
  OrganizationEmployeeSummary,
  OrganizationOverview,
  OrganizationReportingSummary,
  OrganizationTeamSummary,
  OrganizationTreeEdge,
  OrganizationTreeNode,
  ServiceContext,
  ServiceResult,
} from '../lib/types';
import { requirePermission } from '../lib/auth-wrapper';
import { requirePlanFeature } from '../lib/entitlements';

type ProfileRow = { id: string; full_name: string | null };
type EmployeeRow = {
  id: string;
  employee_code: string | null;
  manager_id: string | null;
  department_id: string | null;
  team_id: string | null;
  designation: string | null;
  job_level: string | null;
  employment_status: string | null;
  user_profile_id: string | null;
};
type DepartmentRow = {
  id: string;
  name: string;
  parent_department_id?: string | null;
  head_employee_id?: string | null;
};
type TeamRow = {
  id: string;
  name: string;
  department_id: string | null;
  team_lead_id?: string | null;
};
type ReportingLineRow = {
  id: string;
  company_id: string;
  employee_id: string;
  manager_employee_id: string;
  relation_type:
    | 'direct_manager'
    | 'dotted_line'
    | 'senior_manager'
    | 'team_lead'
    | 'hr_manager'
    | 'payroll_reviewer'
    | 'project_manager';
  is_primary: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  created_by: string | null;
};

type OrgChartNode = {
  employee_id: string;
  employee_name: string;
  designation: string | null;
  children: OrgChartNode[];
};

type OrgChartDepartment = {
  department_id: string;
  department_name: string;
  roots: OrgChartNode[];
};

type OrgChartResponse = {
  departments: OrgChartDepartment[];
};

type OrganizationCore = {
  employees: EmployeeRow[];
  departments: DepartmentRow[];
  teams: TeamRow[];
  profilesById: Map<string, ProfileRow>;
  reportingLines: ReportingLineRow[];
  activePrimaryManagerByEmployeeId: Map<string, string>;
  activeSecondaryManagersByEmployeeId: Map<string, ReportingLineRow[]>;
};

function isActiveReportingLine(line: ReportingLineRow): boolean {
  return !line.effective_to || new Date(line.effective_to) >= new Date(new Date().toDateString());
}

async function loadDepartments(ctx: ServiceContext): Promise<DepartmentRow[]> {
  const { data, error } = await ctx.supabase
    .from('departments')
    .select('id, name, parent_department_id, head_employee_id')
    .eq('company_id', ctx.companyId)
    .order('name');

  if (!error) return (data as DepartmentRow[] | null) ?? [];

  const fallback = await ctx.supabase
    .from('departments')
    .select('id, name, parent_department_id')
    .eq('company_id', ctx.companyId)
    .order('name');

  if (fallback.error) throw fallback.error;
  return ((fallback.data as DepartmentRow[] | null) ?? []).map((department) => ({
    ...department,
    head_employee_id: null,
  }));
}

async function loadReportingLines(ctx: ServiceContext): Promise<ReportingLineRow[]> {
  const { data, error } = await ctx.supabase
    .from('employee_reporting_lines')
    .select(
      'id, company_id, employee_id, manager_employee_id, relation_type, is_primary, effective_from, effective_to, created_at, created_by',
    )
    .eq('company_id', ctx.companyId);

  if (error) return [];
  return ((data as ReportingLineRow[] | null) ?? []).filter(isActiveReportingLine);
}

async function buildOrganizationCore(ctx: ServiceContext): Promise<OrganizationCore> {
  const [employeesResult, departments, teamsResult, profilesResult, reportingLines] = await Promise.all([
    ctx.supabase
      .from('employees')
      .select(
        'id, employee_code, manager_id, department_id, team_id, designation, job_level, employment_status, user_profile_id',
      )
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false),
    loadDepartments(ctx),
    ctx.supabase
      .from('teams')
      .select('id, name, department_id, team_lead_id')
      .eq('company_id', ctx.companyId)
      .eq('is_deleted', false)
      .order('name'),
    ctx.supabase
      .from('user_profiles')
      .select('id, full_name')
      .eq('company_id', ctx.companyId)
      .order('full_name'),
    loadReportingLines(ctx),
  ]);

  if (employeesResult.error) throw employeesResult.error;
  if (teamsResult.error) throw teamsResult.error;
  if (profilesResult.error) throw profilesResult.error;

  const employees = (employeesResult.data as EmployeeRow[] | null) ?? [];
  const teams = (teamsResult.data as TeamRow[] | null) ?? [];
  const profiles = (profilesResult.data as ProfileRow[] | null) ?? [];
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  const activePrimaryManagerByEmployeeId = new Map<string, string>();
  const activeSecondaryManagersByEmployeeId = new Map<string, ReportingLineRow[]>();

  for (const line of reportingLines) {
    if (line.is_primary) {
      activePrimaryManagerByEmployeeId.set(line.employee_id, line.manager_employee_id);
      continue;
    }
    const existing = activeSecondaryManagersByEmployeeId.get(line.employee_id) ?? [];
    existing.push(line);
    activeSecondaryManagersByEmployeeId.set(line.employee_id, existing);
  }

  return {
    employees,
    departments,
    teams,
    profilesById,
    reportingLines,
    activePrimaryManagerByEmployeeId,
    activeSecondaryManagersByEmployeeId,
  };
}

function getEmployeeName(employee: EmployeeRow, profilesById: Map<string, ProfileRow>): string {
  if (employee.user_profile_id) {
    const profile = profilesById.get(employee.user_profile_id);
    if (profile?.full_name) return profile.full_name;
  }
  return employee.employee_code ?? 'Unknown employee';
}

function buildLegacyOrgTree(core: OrganizationCore): OrgChartResponse {
  const nodesById = new Map<string, OrgChartNode>();
  const childrenByManagerId = new Map<string | null, EmployeeRow[]>();

  for (const employee of core.employees) {
    nodesById.set(employee.id, {
      employee_id: employee.id,
      employee_name: getEmployeeName(employee, core.profilesById),
      designation: employee.designation,
      children: [],
    });
  }

  for (const employee of core.employees) {
    const primaryManagerId = core.activePrimaryManagerByEmployeeId.get(employee.id) ?? employee.manager_id ?? null;
    const bucket = childrenByManagerId.get(primaryManagerId) ?? [];
    bucket.push(employee);
    childrenByManagerId.set(primaryManagerId, bucket);
  }

  for (const employee of core.employees) {
    const node = nodesById.get(employee.id);
    if (!node) continue;
    const reports = childrenByManagerId.get(employee.id) ?? [];
    node.children = reports
      .map((report) => nodesById.get(report.id))
      .filter((child): child is OrgChartNode => Boolean(child))
      .sort((left, right) => left.employee_name.localeCompare(right.employee_name));
  }

  const departments = core.departments.map((department) => {
    const departmentEmployees = core.employees.filter((employee) => employee.department_id === department.id);
    const roots = departmentEmployees
      .filter((employee) => {
        const primaryManagerId = core.activePrimaryManagerByEmployeeId.get(employee.id) ?? employee.manager_id ?? null;
        return !primaryManagerId || !departmentEmployees.some((candidate) => candidate.id === primaryManagerId);
      })
      .map((employee) => nodesById.get(employee.id))
      .filter((node): node is OrgChartNode => Boolean(node))
      .sort((left, right) => left.employee_name.localeCompare(right.employee_name));

    return {
      department_id: department.id,
      department_name: department.name,
      roots,
    };
  });

  return { departments };
}

export async function getOrgChart(ctx: ServiceContext): Promise<ServiceResult<OrgChartResponse>> {
  try {
    await requirePlanFeature(ctx, 'feature.core_employee_management');
    requirePermission('manage_employees', ctx);

    const core = await buildOrganizationCore(ctx);
    return {
      ok: true,
      data: buildLegacyOrgTree(core),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load org chart',
    };
  }
}

export async function getOrganizationOverview(
  ctx: ServiceContext,
): Promise<ServiceResult<OrganizationOverview>> {
  try {
    await requirePlanFeature(ctx, 'feature.core_employee_management');
    requirePermission('manage_employees', ctx);

    const core = await buildOrganizationCore(ctx);

    const employeeById = new Map(core.employees.map((employee) => [employee.id, employee]));
    const teamsByDepartmentId = new Map<string, TeamRow[]>();
    const employeesByDepartmentId = new Map<string, EmployeeRow[]>();
    const employeesByTeamId = new Map<string, EmployeeRow[]>();
    const subordinateCountByManagerId = new Map<string, number>();

    for (const team of core.teams) {
      if (!team.department_id) continue;
      const bucket = teamsByDepartmentId.get(team.department_id) ?? [];
      bucket.push(team);
      teamsByDepartmentId.set(team.department_id, bucket);
    }

    for (const employee of core.employees) {
      if (employee.department_id) {
        const departmentBucket = employeesByDepartmentId.get(employee.department_id) ?? [];
        departmentBucket.push(employee);
        employeesByDepartmentId.set(employee.department_id, departmentBucket);
      }
      if (employee.team_id) {
        const teamBucket = employeesByTeamId.get(employee.team_id) ?? [];
        teamBucket.push(employee);
        employeesByTeamId.set(employee.team_id, teamBucket);
      }

      const primaryManagerId = core.activePrimaryManagerByEmployeeId.get(employee.id) ?? employee.manager_id ?? null;
      if (primaryManagerId) {
        subordinateCountByManagerId.set(primaryManagerId, (subordinateCountByManagerId.get(primaryManagerId) ?? 0) + 1);
      }
    }

    const employeeSummaryById = new Map<string, OrganizationEmployeeSummary>();
    const reportingSummaries: OrganizationReportingSummary[] = core.employees.map((employee) => {
      const primaryManagerId = core.activePrimaryManagerByEmployeeId.get(employee.id) ?? employee.manager_id ?? null;
      const primaryManager = primaryManagerId ? employeeById.get(primaryManagerId) ?? null : null;
      const secondaryLines = core.activeSecondaryManagersByEmployeeId.get(employee.id) ?? [];
      const secondaryManagers = secondaryLines
        .map((line) => {
          const manager = employeeById.get(line.manager_employee_id);
          if (!manager) return null;
          return {
            id: manager.id,
            full_name: getEmployeeName(manager, core.profilesById),
            employee_code: manager.employee_code,
            relation_type: line.relation_type,
          };
        })
        .filter((manager): manager is NonNullable<typeof manager> => Boolean(manager));

      const summary: OrganizationReportingSummary = {
        employee_id: employee.id,
        employee_name: getEmployeeName(employee, core.profilesById),
        employee_code: employee.employee_code,
        primary_manager: primaryManager
          ? {
              id: primaryManager.id,
              full_name: getEmployeeName(primaryManager, core.profilesById),
              employee_code: primaryManager.employee_code,
            }
          : null,
        secondary_managers: secondaryManagers,
        subordinate_count: subordinateCountByManagerId.get(employee.id) ?? 0,
      };

      employeeSummaryById.set(employee.id, {
        id: employee.id,
        employee_code: employee.employee_code,
        full_name: getEmployeeName(employee, core.profilesById),
        designation: employee.designation,
        job_level: employee.job_level,
        employment_status: employee.employment_status,
        department_id: employee.department_id,
        team_id: employee.team_id,
        primary_manager_id: primaryManagerId,
        secondary_manager_ids: secondaryManagers.map((manager) => manager.id),
      });

      return summary;
    });

    const departments: OrganizationDepartmentSummary[] = core.departments.map((department) => {
      const departmentEmployees = employeesByDepartmentId.get(department.id) ?? [];
      const departmentTeams = teamsByDepartmentId.get(department.id) ?? [];
      const head = department.head_employee_id ? employeeById.get(department.head_employee_id) ?? null : null;
      return {
        id: department.id,
        name: department.name,
        code: null,
        parent_department_id: department.parent_department_id ?? null,
        head: head
          ? {
              id: head.id,
              full_name: getEmployeeName(head, core.profilesById),
              employee_code: head.employee_code,
            }
          : null,
        team_count: departmentTeams.length,
        employee_count: departmentEmployees.length,
      };
    });

    const teams: OrganizationTeamSummary[] = core.teams.map((team) => {
      const lead = team.team_lead_id ? employeeById.get(team.team_lead_id) ?? null : null;
      return {
        id: team.id,
        name: team.name,
        department_id: team.department_id,
        lead: lead
          ? {
              id: lead.id,
              full_name: getEmployeeName(lead, core.profilesById),
              employee_code: lead.employee_code,
            }
          : null,
        employee_count: (employeesByTeamId.get(team.id) ?? []).length,
      };
    });

    const nodes: OrganizationTreeNode[] = [];
    const edges: OrganizationTreeEdge[] = [];

    for (const department of departments) {
      nodes.push({
        id: `dept:${department.id}`,
        type: 'department',
        label: department.name,
        parent_id: department.parent_department_id ? `dept:${department.parent_department_id}` : null,
        meta: {
          employee_count: department.employee_count,
          team_count: department.team_count,
          head_employee_id: department.head?.id ?? null,
        },
      });

      if (department.parent_department_id) {
        edges.push({
          id: `edge:dept:${department.parent_department_id}:${department.id}`,
          from: `dept:${department.parent_department_id}`,
          to: `dept:${department.id}`,
          edge_type: 'department_parent',
          relation_type: null,
          is_primary: true,
        });
      }
    }

    for (const team of teams) {
      nodes.push({
        id: `team:${team.id}`,
        type: 'team',
        label: team.name,
        parent_id: team.department_id ? `dept:${team.department_id}` : null,
        meta: {
          department_id: team.department_id,
          lead_employee_id: team.lead?.id ?? null,
          employee_count: team.employee_count,
        },
      });

      if (team.department_id) {
        edges.push({
          id: `edge:dept:${team.department_id}:team:${team.id}`,
          from: `dept:${team.department_id}`,
          to: `team:${team.id}`,
          edge_type: 'department_contains',
          relation_type: null,
          is_primary: true,
        });
      }
    }

    for (const employee of core.employees) {
      nodes.push({
        id: `emp:${employee.id}`,
        type: 'employee',
        label: getEmployeeName(employee, core.profilesById),
        parent_id: employee.team_id
          ? `team:${employee.team_id}`
          : employee.department_id
            ? `dept:${employee.department_id}`
            : null,
        meta: {
          employee_code: employee.employee_code,
          designation: employee.designation,
          department_id: employee.department_id,
          team_id: employee.team_id,
          job_level: employee.job_level,
        },
      });

      if (employee.team_id) {
        edges.push({
          id: `edge:team:${employee.team_id}:emp:${employee.id}`,
          from: `team:${employee.team_id}`,
          to: `emp:${employee.id}`,
          edge_type: 'team_contains',
          relation_type: null,
          is_primary: true,
        });
      } else if (employee.department_id) {
        edges.push({
          id: `edge:dept:${employee.department_id}:emp:${employee.id}`,
          from: `dept:${employee.department_id}`,
          to: `emp:${employee.id}`,
          edge_type: 'department_contains',
          relation_type: null,
          is_primary: true,
        });
      }

      const primaryManagerId = core.activePrimaryManagerByEmployeeId.get(employee.id) ?? employee.manager_id ?? null;
      if (primaryManagerId) {
        edges.push({
          id: `edge:mgr:${primaryManagerId}:emp:${employee.id}`,
          from: `emp:${primaryManagerId}`,
          to: `emp:${employee.id}`,
          edge_type: 'reporting',
          relation_type: 'direct_manager',
          is_primary: true,
        });
      }
    }

    for (const line of core.reportingLines.filter((line) => !line.is_primary)) {
      edges.push({
        id: `edge:secondary:${line.id}`,
        from: `emp:${line.manager_employee_id}`,
        to: `emp:${line.employee_id}`,
        edge_type: 'reporting',
        relation_type: line.relation_type,
        is_primary: false,
      });
    }

    const overview: OrganizationOverview = {
      company_id: ctx.companyId,
      departments,
      teams,
      employees: core.employees
        .map((employee) => employeeSummaryById.get(employee.id))
        .filter((employee): employee is OrganizationEmployeeSummary => Boolean(employee)),
      reporting: reportingSummaries,
      tree: {
        company_id: ctx.companyId,
        nodes,
        edges,
      },
    };

    return { ok: true, data: overview };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load organization overview',
    };
  }
}
