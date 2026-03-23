import type {
  OrgReportingRelationType,
  OrganizationFoundationCategoryCount,
  OrganizationFoundationRoleFamily,
  OrganizationFoundationSummary,
  ServiceContext,
  ServiceResult,
} from "../lib/types";
import { requirePlanFeature } from "../lib/entitlements";
import { getAccessibleEmployeeScope, getAccessibleOrgUnitScope, hasBroadOrganizationReadAccess } from "./access-scope.service";

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

type PositionRow = {
  id: string;
  org_unit_id: string;
  job_role_id: string;
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
    const broadAccess = hasBroadOrganizationReadAccess(ctx);
    const [orgUnitScope, employeeScope] = broadAccess
      ? [
          { broadAccess: true, ids: new Set<string>() },
          { broadAccess: true, ids: new Set<string>() },
        ]
      : await Promise.all([getAccessibleOrgUnitScope(ctx), getAccessibleEmployeeScope(ctx)]);

    if (!broadAccess && orgUnitScope.ids.size === 0) {
      return { ok: false, error: "Permission denied" };
    }

    const scopedOrgUnitIds = Array.from(orgUnitScope.ids);

    const [orgUnitTypesResult, orgUnitsResult, positionsResult] = await Promise.all([
      ctx.supabase
        .from("org_unit_types")
        .select("key, category")
        .or(`company_id.eq.${ctx.companyId},is_system.eq.true`)
        .is("is_deleted", false)
        .order("sort_order", { ascending: true }),
      (() => {
        const query = ctx.supabase
          .from("org_units")
          .select("id, unit_type_key, branch_id, legacy_department_id, legacy_team_id")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false);

        return broadAccess ? query : query.in("id", scopedOrgUnitIds);
      })(),
      (() => {
        const query = ctx.supabase
          .from("org_positions")
          .select("id, org_unit_id, job_role_id")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false);

        return broadAccess ? query : query.in("org_unit_id", scopedOrgUnitIds);
      })(),
    ]);

    if (orgUnitTypesResult.error) throw orgUnitTypesResult.error;
    if (orgUnitsResult.error) throw orgUnitsResult.error;
    if (positionsResult.error) throw positionsResult.error;

    const orgUnitTypes = (orgUnitTypesResult.data ?? []) as OrgUnitTypeRow[];
    const orgUnits = (orgUnitsResult.data ?? []) as OrgUnitRow[];
    const positions = (positionsResult.data ?? []) as PositionRow[];

    const visibleJobRoleIds = Array.from(new Set(positions.map((position) => position.job_role_id)));
    const jobRolesResult = visibleJobRoleIds.length
      ? await ctx.supabase
          .from("job_roles")
          .select("id, role_family_id")
          .in("id", visibleJobRoleIds)
          .is("is_deleted", false)
      : { data: [], error: null };

    if (jobRolesResult.error) throw jobRolesResult.error;
    const jobRoles = (jobRolesResult.data ?? []) as JobRoleRow[];

    const visibleRoleFamilyIds = Array.from(new Set(jobRoles.map((jobRole) => jobRole.role_family_id)));
    const roleFamiliesResult = visibleRoleFamilyIds.length
      ? await ctx.supabase
          .from("job_role_families")
          .select("id, key, name, is_system_family")
          .in("id", visibleRoleFamilyIds)
          .is("is_deleted", false)
          .order("sort_order", { ascending: true })
      : { data: [], error: null };

    if (roleFamiliesResult.error) throw roleFamiliesResult.error;
    const roleFamilies = (roleFamiliesResult.data ?? []) as RoleFamilyRow[];

    const activeAssignmentCount = broadAccess
      ? await countRows(ctx, "employee_position_assignments", [
          { column: "company_id", value: ctx.companyId },
          { column: "is_deleted", value: false },
          { column: "effective_to", value: null, op: "is" },
        ])
      : (() => {
          const visiblePositionIds = new Set(positions.map((position) => position.id));
          if (visiblePositionIds.size === 0) {
            return Promise.resolve(0);
          }
          return ctx.supabase
            .from("employee_position_assignments")
            .select("id, position_id, effective_to, effective_from")
            .eq("company_id", ctx.companyId)
            .is("is_deleted", false)
            .in("position_id", Array.from(visiblePositionIds))
            .then(({ data, error }) => {
              if (error) throw error;
              return (data ?? []).filter((row: any) => {
                const effectiveFrom = new Date(row.effective_from as string);
                const effectiveTo = row.effective_to ? new Date(row.effective_to as string) : null;
                const today = new Date(new Date().toDateString());
                return effectiveFrom <= today && (!effectiveTo || effectiveTo >= today);
              }).length;
            });
        })();

    const approvalDelegationCount = broadAccess
      ? await countRows(ctx, "approval_delegations", [
          { column: "company_id", value: ctx.companyId },
          { column: "is_deleted", value: false },
        ])
      : ctx.supabase
          .from("approval_delegations")
          .select("id, org_unit_id, delegator_employee_id, delegate_employee_id")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .then(({ data, error }) => {
            if (error) throw error;
            return (data ?? []).filter((row: any) =>
              (row.org_unit_id && orgUnitScope.ids.has(row.org_unit_id as string))
              || (row.delegator_employee_id && employeeScope.ids.has(row.delegator_employee_id as string))
              || (row.delegate_employee_id && employeeScope.ids.has(row.delegate_employee_id as string))
            ).length;
          });

    const approvalRoutingRuleCount = broadAccess
      ? await countRows(ctx, "approval_routing_rules", [
          { column: "company_id", value: ctx.companyId },
          { column: "is_deleted", value: false },
        ])
      : ctx.supabase
          .from("approval_routing_rules")
          .select("id, subject_org_unit_id, subject_geo_org_unit_id, approver_employee_id, delegate_employee_id")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .then(({ data, error }) => {
            if (error) throw error;
            return (data ?? []).filter((row: any) =>
              (row.subject_org_unit_id && orgUnitScope.ids.has(row.subject_org_unit_id as string))
              || (row.subject_geo_org_unit_id && orgUnitScope.ids.has(row.subject_geo_org_unit_id as string))
              || (row.approver_employee_id && employeeScope.ids.has(row.approver_employee_id as string))
              || (row.delegate_employee_id && employeeScope.ids.has(row.delegate_employee_id as string))
            ).length;
          });

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

    const [
      resolvedActiveAssignmentCount,
      resolvedApprovalDelegationCount,
      resolvedApprovalRoutingRuleCount,
    ] = await Promise.all([
      Promise.resolve(activeAssignmentCount),
      Promise.resolve(approvalDelegationCount),
      Promise.resolve(approvalRoutingRuleCount),
    ]);

    const foundation: OrganizationFoundationSummary = {
      company_id: ctx.companyId,
      org_unit_count: orgUnits.length,
      mapped_legacy_unit_count: orgUnits.filter(
        (unit) => unit.branch_id || unit.legacy_department_id || unit.legacy_team_id
      ).length,
      role_family_count: roleFamilies.length,
      job_role_count: jobRoles.length,
      position_count: positions.length,
      active_assignment_count: resolvedActiveAssignmentCount,
      approval_delegation_count: resolvedApprovalDelegationCount,
      approval_routing_rule_count: resolvedApprovalRoutingRuleCount,
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
