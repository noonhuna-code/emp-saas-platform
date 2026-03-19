import type {
  OrgReportingRelationType,
  OrganizationFoundationCategoryCount,
  OrganizationFoundationRoleFamily,
  OrganizationFoundationSummary,
  ServiceContext,
  ServiceResult,
} from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

type OrgUnitTypeRow = {
  key: string;
  category: OrganizationFoundationCategoryCount["category"];
};

type OrgUnitRow = {
  id: string;
  unit_type_key: string;
  branch_id?: string | null;
  legacy_department_id?: string | null;
  legacy_team_id?: string | null;
};

type RoleFamilyRow = {
  id: string;
  key: string;
  name: string;
  is_system_family: boolean;
};

type JobRoleRow = {
  id: string;
  role_family_id: string;
};

const SUPPORTED_RELATION_TYPES: OrgReportingRelationType[] = [
  "direct_manager",
  "dotted_line",
  "senior_manager",
  "team_lead",
  "hr_manager",
  "payroll_reviewer",
  "project_manager",
  "secondary_manager",
  "acting_manager",
  "delegate_approver",
  "skip_level_manager",
  "functional_manager",
  "approval_manager",
  "matrix_manager",
];

const countRows = async (
  ctx: ServiceContext,
  table: string,
  filters: Array<{ column: string; value: unknown; op?: "eq" | "is" }> = []
): Promise<number> => {
  let query = ctx.supabase.from(table).select("*", { count: "exact", head: true });

  for (const filter of filters) {
    if (filter.op === "is") {
      query = query.is(filter.column, filter.value as null | boolean | string);
    } else {
      query = query.eq(filter.column, filter.value);
    }
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
};

export const getOrganizationFoundationSummary = async (
  ctx: ServiceContext
): Promise<ServiceResult<OrganizationFoundationSummary>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_employee_management");
    requirePermission("manage_employees", ctx);

    const [
      orgUnitTypesResult,
      orgUnitsResult,
      roleFamiliesResult,
      jobRolesResult,
      positionCount,
      activeAssignmentCount,
      approvalDelegationCount,
      approvalRoutingRuleCount,
    ] = await Promise.all([
      ctx.supabase.from("org_unit_types").select("key, category").order("sort_order", { ascending: true }),
      ctx.supabase
        .from("org_units")
        .select("id, unit_type_key, branch_id, legacy_department_id, legacy_team_id")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false),
      ctx.supabase
        .from("job_role_families")
        .select("id, key, name, is_system_family")
        .or(`company_id.eq.${ctx.companyId},is_system_family.eq.true`)
        .is("is_deleted", false)
        .order("sort_order", { ascending: true }),
      ctx.supabase
        .from("job_roles")
        .select("id, role_family_id")
        .or(`company_id.eq.${ctx.companyId},is_system_role.eq.true`)
        .is("is_deleted", false),
      countRows(ctx, "org_positions", [
        { column: "company_id", value: ctx.companyId },
        { column: "is_deleted", value: false },
      ]),
      countRows(ctx, "employee_position_assignments", [
        { column: "company_id", value: ctx.companyId },
        { column: "is_deleted", value: false },
        { column: "effective_to", value: null, op: "is" },
      ]),
      countRows(ctx, "approval_delegations", [
        { column: "company_id", value: ctx.companyId },
        { column: "is_deleted", value: false },
      ]),
      countRows(ctx, "approval_routing_rules", [
        { column: "company_id", value: ctx.companyId },
        { column: "is_deleted", value: false },
      ]),
    ]);

    if (orgUnitTypesResult.error) throw orgUnitTypesResult.error;
    if (orgUnitsResult.error) throw orgUnitsResult.error;
    if (roleFamiliesResult.error) throw roleFamiliesResult.error;
    if (jobRolesResult.error) throw jobRolesResult.error;

    const orgUnitTypes = (orgUnitTypesResult.data ?? []) as OrgUnitTypeRow[];
    const orgUnits = (orgUnitsResult.data ?? []) as OrgUnitRow[];
    const roleFamilies = (roleFamiliesResult.data ?? []) as RoleFamilyRow[];
    const jobRoles = (jobRolesResult.data ?? []) as JobRoleRow[];

    const categoryByTypeKey = new Map(orgUnitTypes.map((row) => [row.key, row.category]));
    const categoryCountsMap = new Map<OrganizationFoundationCategoryCount["category"], number>();

    for (const unit of orgUnits) {
      const category = categoryByTypeKey.get(unit.unit_type_key);
      if (!category) continue;
      categoryCountsMap.set(category, (categoryCountsMap.get(category) ?? 0) + 1);
    }

    const roleCountByFamilyId = new Map<string, number>();
    for (const jobRole of jobRoles) {
      roleCountByFamilyId.set(jobRole.role_family_id, (roleCountByFamilyId.get(jobRole.role_family_id) ?? 0) + 1);
    }

    const foundation: OrganizationFoundationSummary = {
      company_id: ctx.companyId,
      org_unit_count: orgUnits.length,
      mapped_legacy_unit_count: orgUnits.filter(
        (unit) => unit.branch_id || unit.legacy_department_id || unit.legacy_team_id
      ).length,
      role_family_count: roleFamilies.length,
      job_role_count: jobRoles.length,
      position_count: positionCount,
      active_assignment_count: activeAssignmentCount,
      approval_delegation_count: approvalDelegationCount,
      approval_routing_rule_count: approvalRoutingRuleCount,
      unit_category_counts: Array.from(categoryCountsMap.entries()).map(([category, count]) => ({
        category,
        count,
      })),
      role_families: roleFamilies.map(
        (family): OrganizationFoundationRoleFamily => ({
          id: family.id,
          key: family.key,
          name: family.name,
          role_count: roleCountByFamilyId.get(family.id) ?? 0,
          is_system_family: family.is_system_family,
        })
      ),
      supported_relation_types: SUPPORTED_RELATION_TYPES,
    };

    return { ok: true, data: foundation };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load organization foundation",
    };
  }
};
