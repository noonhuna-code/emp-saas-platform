import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

export type OrgChartNode = {
  id: string;
  full_name: string;
  designation?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  reports?: OrgChartNode[];
};

export type OrgChartDepartment = {
  id: string;
  name: string;
  nodes: OrgChartNode[];
};

export type OrgChartResponse = {
  departments: OrgChartDepartment[];
  unassigned: OrgChartNode[];
};

export const getOrgChart = async (ctx: ServiceContext): Promise<ServiceResult<OrgChartResponse>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_employee_management");
    requirePermission("manage_employees", ctx);

    const [employees, profiles, departments] = await Promise.all([
      ctx.supabase
        .from("employees")
        .select("id, manager_id, department_id, team_id, designation, user_profile_id")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false),
      ctx.supabase
        .from("user_profiles")
        .select("id, full_name")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false),
      ctx.supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
    ]);

    if (employees.error || profiles.error || departments.error) {
      return { ok: false, error: "Unable to load org chart" };
    }

    const profileRows = (profiles.data ?? []) as Array<{ id: string; full_name: string }>;
    const employeeRows = (employees.data ?? []) as Array<{
      id: string;
      manager_id?: string | null;
      department_id?: string | null;
      team_id?: string | null;
      designation?: string | null;
      user_profile_id?: string | null;
    }>;

    const nameByProfile = new Map(profileRows.map((row) => [row.id, row.full_name]));

    const nodes: OrgChartNode[] = employeeRows.map((row) => ({
      id: row.id,
      full_name: nameByProfile.get(row.user_profile_id ?? "") ?? "Employee",
      designation: row.designation ?? null,
      department_id: row.department_id ?? null,
      team_id: row.team_id ?? null,
      manager_id: row.manager_id ?? null,
      reports: []
    }));

    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const roots: OrgChartNode[] = [];

    nodes.forEach((node) => {
      if (node.manager_id && nodeById.has(node.manager_id)) {
        const manager = nodeById.get(node.manager_id);
        if (manager) manager.reports?.push(node);
      } else {
        roots.push(node);
      }
    });

    const deptMap = new Map((departments.data ?? []).map((row) => [row.id, row.name]));
    const departmentBuckets = new Map<string, OrgChartNode[]>();
    const unassigned: OrgChartNode[] = [];

    roots.forEach((node) => {
      if (node.department_id && deptMap.has(node.department_id)) {
        if (!departmentBuckets.has(node.department_id)) {
          departmentBuckets.set(node.department_id, []);
        }
        departmentBuckets.get(node.department_id)?.push(node);
      } else {
        unassigned.push(node);
      }
    });

    const departmentList: OrgChartDepartment[] = Array.from(departmentBuckets.entries()).map(([id, list]) => ({
      id,
      name: deptMap.get(id) ?? "Department",
      nodes: list
    }));

    return {
      ok: true,
      data: {
        departments: departmentList,
        unassigned
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Org chart failed" };
  }
};
