import type { ServiceContext } from "../lib/types";

const BROAD_ORG_READ_PERMISSIONS = [
  "manage_company",
  "manage_roles",
  "manage_departments",
  "manage_employees",
  "manage_org_structure",
  "manage_positions",
  "manage_reporting_lines",
  "manage_delegations",
  "manage_approval_routing",
] as const;

type AccessScopeResult = {
  broadAccess: boolean;
  ids: Set<string>;
};

export type AccessExplanationReason = {
  code: string;
  label: string;
  source: "broad_permission" | "derived" | "explicit" | "context";
  detail?: string;
  relationType?: string | null;
  scopeType?: string | null;
  scopeEntityId?: string | null;
  inherited?: boolean;
};

export type EmployeeAccessExplanation = {
  employeeId: string;
  allowed: boolean;
  broadAccess: boolean;
  reasons: AccessExplanationReason[];
};

export type OrgUnitAccessExplanation = {
  orgUnitId: string;
  allowed: boolean;
  broadAccess: boolean;
  reasons: AccessExplanationReason[];
};

type ActorContext = {
  employeeId: string | null;
};

type ExplicitScopeAssignment = {
  scope_type: string;
  scope_entity_id: string;
  inherits_children: boolean;
};

type EmployeeContextRow = {
  id: string;
  branch_id?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
};

type OrgUnitContextRow = {
  id: string;
  parent_org_unit_id?: string | null;
  unit_type_key?: string | null;
  branch_id?: string | null;
  legacy_department_id?: string | null;
  legacy_team_id?: string | null;
};

const normalizeUuidRows = (data: unknown): string[] => {
  if (!Array.isArray(data)) {
    return [];
  }

  const ids: string[] = [];
  for (const row of data) {
    if (typeof row === "string" && row.length > 0) {
      ids.push(row);
      continue;
    }

    if (row && typeof row === "object") {
      const values = Object.values(row as Record<string, unknown>);
      const firstString = values.find((value): value is string => typeof value === "string" && value.length > 0);
      if (firstString) {
        ids.push(firstString);
      }
    }
  }

  return Array.from(new Set(ids));
};

export const hasBroadOrganizationReadAccess = (ctx: ServiceContext): boolean =>
  BROAD_ORG_READ_PERMISSIONS.some((permission) => ctx.permissions.includes(permission));

const uniqueReasons = (reasons: AccessExplanationReason[]): AccessExplanationReason[] => {
  const seen = new Set<string>();
  const result: AccessExplanationReason[] = [];

  for (const reason of reasons) {
    const key = [
      reason.code,
      reason.source,
      reason.scopeType ?? "",
      reason.scopeEntityId ?? "",
      reason.relationType ?? "",
      reason.inherited ? "1" : "0",
      reason.detail ?? "",
    ].join("|");

    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(reason);
  }

  return result;
};

const loadScopedUuidSet = async (
  ctx: ServiceContext,
  rpcName: "current_user_accessible_employee_ids" | "current_user_accessible_org_unit_ids"
): Promise<Set<string>> => {
  const { data, error } = await ctx.supabase.rpc(rpcName);
  if (error) {
    throw new Error(error.message);
  }
  return new Set(normalizeUuidRows(data));
};

const resolveActorContext = async (ctx: ServiceContext): Promise<ActorContext> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && typeof data === "string") {
      return { employeeId: data };
    }
  } catch {
    // fall back to direct query
  }

  const { data } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return { employeeId: (data?.id as string | undefined) ?? null };
};

const loadExplicitAssignments = async (ctx: ServiceContext): Promise<ExplicitScopeAssignment[]> => {
  const { data, error } = await ctx.supabase
    .from("org_access_scope_assignments")
    .select("scope_type, scope_entity_id, inherits_children")
    .eq("company_id", ctx.companyId)
    .eq("user_id", ctx.userId)
    .is("is_deleted", false);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ExplicitScopeAssignment[];
};

const loadEmployeeContext = async (ctx: ServiceContext, employeeId: string): Promise<EmployeeContextRow | null> => {
  const { data, error } = await ctx.supabase
    .from("employees")
    .select("id, branch_id, department_id, team_id, manager_id")
    .eq("company_id", ctx.companyId)
    .eq("id", employeeId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as EmployeeContextRow | null) ?? null;
};

const loadOrgUnitContext = async (ctx: ServiceContext, orgUnitId: string): Promise<OrgUnitContextRow | null> => {
  const { data, error } = await ctx.supabase
    .from("org_units")
    .select("id, parent_org_unit_id, unit_type_key, branch_id, legacy_department_id, legacy_team_id")
    .eq("company_id", ctx.companyId)
    .eq("id", orgUnitId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as OrgUnitContextRow | null) ?? null;
};

const loadCompanyOrgUnits = async (ctx: ServiceContext): Promise<OrgUnitContextRow[]> => {
  const { data, error } = await ctx.supabase
    .from("org_units")
    .select("id, parent_org_unit_id, unit_type_key, branch_id, legacy_department_id, legacy_team_id")
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OrgUnitContextRow[];
};

const addExplicitReasonIfMatch = (
  reasons: AccessExplanationReason[],
  assignment: ExplicitScopeAssignment,
  label: string,
  detail: string,
  inherited = false
): void => {
  reasons.push({
    code: "explicit_scope_assignment",
    label,
    source: "explicit",
    detail,
    scopeType: assignment.scope_type,
    scopeEntityId: assignment.scope_entity_id,
    inherited,
  });
};

export const getAccessibleEmployeeScope = async (ctx: ServiceContext): Promise<AccessScopeResult> => {
  if (hasBroadOrganizationReadAccess(ctx)) {
    return { broadAccess: true, ids: new Set<string>() };
  }

  return {
    broadAccess: false,
    ids: await loadScopedUuidSet(ctx, "current_user_accessible_employee_ids"),
  };
};

export const getAccessibleOrgUnitScope = async (ctx: ServiceContext): Promise<AccessScopeResult> => {
  if (hasBroadOrganizationReadAccess(ctx)) {
    return { broadAccess: true, ids: new Set<string>() };
  }

  return {
    broadAccess: false,
    ids: await loadScopedUuidSet(ctx, "current_user_accessible_org_unit_ids"),
  };
};

export const assertEmployeeReadAccess = async (ctx: ServiceContext, employeeId: string): Promise<void> => {
  if (!employeeId) {
    throw new Error("Employee id required");
  }

  const scope = await getAccessibleEmployeeScope(ctx);
  if (scope.broadAccess || scope.ids.has(employeeId)) {
    return;
  }

  throw new Error("Permission denied");
};

export const explainEmployeeReadAccess = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<EmployeeAccessExplanation> => {
  const [scope, actor, explicitAssignments, targetEmployee] = await Promise.all([
    getAccessibleEmployeeScope(ctx),
    resolveActorContext(ctx),
    loadExplicitAssignments(ctx),
    loadEmployeeContext(ctx, employeeId),
  ]);

  const reasons: AccessExplanationReason[] = [];
  const broadAccess = scope.broadAccess;

  if (broadAccess) {
    reasons.push({
      code: "broad_org_read_permission",
      label: "Broad organization read access",
      source: "broad_permission",
      detail: "Current permissions place this session in the broad company-scoped org read path.",
    });
  }

  if (!targetEmployee) {
    return {
      employeeId,
      allowed: false,
      broadAccess,
      reasons,
    };
  }

  if (actor.employeeId && actor.employeeId === employeeId) {
    reasons.push({
      code: "self_scope",
      label: "Self scope",
      source: "derived",
      detail: "The target employee is the current user’s own employee record.",
    });
  }

  if (actor.employeeId && targetEmployee.manager_id === actor.employeeId) {
    reasons.push({
      code: "direct_manager_scope",
      label: "Direct manager scope",
      source: "derived",
      relationType: "direct_manager",
      detail: "The target employee reports through employees.manager_id to the current employee.",
    });
  }

  if (actor.employeeId) {
    const [reportingRows, departmentHeadRows, teamLeadRows, positionRows] = await Promise.all([
      ctx.supabase
        .from("employee_reporting_lines")
        .select("relation_type")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .eq("manager_employee_id", actor.employeeId),
      targetEmployee.department_id
        ? ctx.supabase
            .from("departments")
            .select("id")
            .eq("company_id", ctx.companyId)
            .eq("id", targetEmployee.department_id)
            .eq("head_employee_id", actor.employeeId)
            .is("is_deleted", false)
        : Promise.resolve({ data: [], error: null }),
      targetEmployee.team_id
        ? ctx.supabase
            .from("teams")
            .select("id")
            .eq("company_id", ctx.companyId)
            .eq("id", targetEmployee.team_id)
            .eq("team_lead_id", actor.employeeId)
            .is("is_deleted", false)
        : Promise.resolve({ data: [], error: null }),
      ctx.supabase
        .from("employee_position_assignments")
        .select("position_id, org_positions(org_unit_id)")
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .is("is_deleted", false),
    ]);

    if (reportingRows.error) throw new Error(reportingRows.error.message);
    if (departmentHeadRows.error) throw new Error(departmentHeadRows.error.message);
    if (teamLeadRows.error) throw new Error(teamLeadRows.error.message);
    if (positionRows.error) throw new Error(positionRows.error.message);

    for (const row of reportingRows.data ?? []) {
      reasons.push({
        code: "reporting_line_scope",
        label: "Reporting-line scope",
        source: "derived",
        relationType: (row as { relation_type?: string | null }).relation_type ?? null,
        detail: "An active reporting-line relationship links the current employee to the target employee.",
      });
    }

    if ((departmentHeadRows.data ?? []).length > 0) {
      reasons.push({
        code: "department_head_scope",
        label: "Department head scope",
        source: "derived",
        detail: "The current employee is the head of the target employee’s department.",
      });
    }

    if ((teamLeadRows.data ?? []).length > 0) {
      reasons.push({
        code: "team_lead_scope",
        label: "Team lead scope",
        source: "derived",
        detail: "The current employee is the lead of the target employee’s team.",
      });
    }

    const targetOrgUnitIds = new Set<string>();
    if (targetEmployee.branch_id || targetEmployee.department_id || targetEmployee.team_id) {
      const { data: relatedUnits, error } = await ctx.supabase
        .from("org_units")
        .select("id")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .or(
          [
            targetEmployee.branch_id ? `branch_id.eq.${targetEmployee.branch_id}` : null,
            targetEmployee.department_id ? `legacy_department_id.eq.${targetEmployee.department_id}` : null,
            targetEmployee.team_id ? `legacy_team_id.eq.${targetEmployee.team_id}` : null,
          ].filter(Boolean).join(",")
        );
      if (error) throw new Error(error.message);
      for (const row of relatedUnits ?? []) {
        if ((row as { id?: string }).id) {
          targetOrgUnitIds.add((row as { id: string }).id);
        }
      }
    }

    for (const row of positionRows.data ?? []) {
      const orgPositions = (row as { org_positions?: { org_unit_id?: string | null }[] | { org_unit_id?: string | null } | null }).org_positions;
      const orgPosition = Array.isArray(orgPositions) ? orgPositions[0] : orgPositions;
      if (orgPosition?.org_unit_id) {
        targetOrgUnitIds.add(orgPosition.org_unit_id);
      }
    }

    const allOrgUnits = targetOrgUnitIds.size > 0 ? await loadCompanyOrgUnits(ctx) : [];
    const orgUnitsById = new Map(allOrgUnits.map((row) => [row.id, row]));
    const ancestorsByTargetOrgUnit = new Map<string, Set<string>>();
    for (const targetOrgUnitId of targetOrgUnitIds) {
      const ancestors = new Set<string>();
      let cursor = orgUnitsById.get(targetOrgUnitId)?.parent_org_unit_id ?? null;
      while (cursor) {
        ancestors.add(cursor);
        cursor = orgUnitsById.get(cursor)?.parent_org_unit_id ?? null;
      }
      ancestorsByTargetOrgUnit.set(targetOrgUnitId, ancestors);
    }

    for (const assignment of explicitAssignments) {
      if (assignment.scope_type === "employee" && assignment.scope_entity_id === employeeId) {
        addExplicitReasonIfMatch(
          reasons,
          assignment,
          "Explicit employee scope",
          "The target employee is directly covered by an explicit employee scope assignment."
        );
      }

      if (assignment.scope_type === "company" && assignment.scope_entity_id === ctx.companyId) {
        addExplicitReasonIfMatch(
          reasons,
          assignment,
          "Explicit company scope",
          "The current user has an explicit company-wide read scope assignment."
        );
      }

      if (assignment.scope_type === "branch" && targetEmployee.branch_id && assignment.scope_entity_id === targetEmployee.branch_id) {
        addExplicitReasonIfMatch(
          reasons,
          assignment,
          "Explicit branch scope",
          "The target employee belongs to a branch that is explicitly assigned to the current user."
        );
      }

      if (assignment.scope_type === "department" && targetEmployee.department_id && assignment.scope_entity_id === targetEmployee.department_id) {
        addExplicitReasonIfMatch(
          reasons,
          assignment,
          "Explicit department scope",
          "The target employee belongs to a department that is explicitly assigned to the current user."
        );
      }

      if (assignment.scope_type === "team" && targetEmployee.team_id && assignment.scope_entity_id === targetEmployee.team_id) {
        addExplicitReasonIfMatch(
          reasons,
          assignment,
          "Explicit team scope",
          "The target employee belongs to a team that is explicitly assigned to the current user."
        );
      }

      if (["org_unit", "region", "business_unit"].includes(assignment.scope_type)) {
        for (const targetOrgUnitId of targetOrgUnitIds) {
          if (assignment.scope_entity_id === targetOrgUnitId) {
            addExplicitReasonIfMatch(
              reasons,
              assignment,
              "Explicit org-unit scope",
              "The target employee belongs to an org unit that is explicitly assigned to the current user."
            );
          }

          if (assignment.inherits_children && ancestorsByTargetOrgUnit.get(targetOrgUnitId)?.has(assignment.scope_entity_id)) {
            addExplicitReasonIfMatch(
              reasons,
              assignment,
              "Inherited org-unit scope",
              "The target employee belongs to a descendant org unit of an explicitly assigned scoped org unit.",
              true
            );
          }
        }
      }
    }
  }

  return {
    employeeId,
    allowed: broadAccess || scope.ids.has(employeeId),
    broadAccess,
    reasons: uniqueReasons(reasons),
  };
};

export const explainOrgUnitReadAccess = async (
  ctx: ServiceContext,
  orgUnitId: string
): Promise<OrgUnitAccessExplanation> => {
  const [scope, actor, explicitAssignments, targetOrgUnit, allOrgUnits] = await Promise.all([
    getAccessibleOrgUnitScope(ctx),
    resolveActorContext(ctx),
    loadExplicitAssignments(ctx),
    loadOrgUnitContext(ctx, orgUnitId),
    loadCompanyOrgUnits(ctx),
  ]);

  const reasons: AccessExplanationReason[] = [];
  const broadAccess = scope.broadAccess;

  if (broadAccess) {
    reasons.push({
      code: "broad_org_read_permission",
      label: "Broad organization read access",
      source: "broad_permission",
      detail: "Current permissions place this session in the broad company-scoped org read path.",
    });
  }

  if (!targetOrgUnit) {
    return {
      orgUnitId,
      allowed: false,
      broadAccess,
      reasons,
    };
  }

  const orgUnitsById = new Map(allOrgUnits.map((row) => [row.id, row]));
  const ancestors = new Set<string>();
  let cursor = targetOrgUnit.parent_org_unit_id ?? null;
  while (cursor) {
    ancestors.add(cursor);
    cursor = orgUnitsById.get(cursor)?.parent_org_unit_id ?? null;
  }

  if (actor.employeeId) {
    if (targetOrgUnit.legacy_department_id) {
      const { data, error } = await ctx.supabase
        .from("departments")
        .select("id")
        .eq("company_id", ctx.companyId)
        .eq("id", targetOrgUnit.legacy_department_id)
        .eq("head_employee_id", actor.employeeId)
        .is("is_deleted", false);
      if (error) throw new Error(error.message);
      if ((data ?? []).length > 0) {
        reasons.push({
          code: "department_head_scope",
          label: "Department head scope",
          source: "derived",
          detail: "The current employee heads the department mapped to this org unit.",
        });
      }
    }

    if (targetOrgUnit.legacy_team_id) {
      const { data, error } = await ctx.supabase
        .from("teams")
        .select("id")
        .eq("company_id", ctx.companyId)
        .eq("id", targetOrgUnit.legacy_team_id)
        .eq("team_lead_id", actor.employeeId)
        .is("is_deleted", false);
      if (error) throw new Error(error.message);
      if ((data ?? []).length > 0) {
        reasons.push({
          code: "team_lead_scope",
          label: "Team lead scope",
          source: "derived",
          detail: "The current employee leads the team mapped to this org unit.",
        });
      }
    }
  }

  for (const assignment of explicitAssignments) {
    if (assignment.scope_type === "company" && assignment.scope_entity_id === ctx.companyId) {
      addExplicitReasonIfMatch(
        reasons,
        assignment,
        "Explicit company scope",
        "The current user has an explicit company-wide read scope assignment."
      );
    }

    if (["org_unit", "region", "business_unit"].includes(assignment.scope_type) && assignment.scope_entity_id === orgUnitId) {
      addExplicitReasonIfMatch(
        reasons,
        assignment,
        "Explicit org-unit scope",
        "This org unit is directly covered by an explicit scope assignment."
      );
    }

    if (assignment.inherits_children && ancestors.has(assignment.scope_entity_id) && ["org_unit", "region", "business_unit"].includes(assignment.scope_type)) {
      addExplicitReasonIfMatch(
        reasons,
        assignment,
        "Inherited org-unit scope",
        "This org unit is a descendant of an explicitly scoped org unit.",
        true
      );
    }

    if (assignment.scope_type === "branch" && targetOrgUnit.branch_id && assignment.scope_entity_id === targetOrgUnit.branch_id) {
      addExplicitReasonIfMatch(
        reasons,
        assignment,
        "Explicit branch scope",
        "This org unit is mapped to a branch explicitly assigned to the current user."
      );
    }

    if (assignment.scope_type === "department" && targetOrgUnit.legacy_department_id && assignment.scope_entity_id === targetOrgUnit.legacy_department_id) {
      addExplicitReasonIfMatch(
        reasons,
        assignment,
        "Explicit department scope",
        "This org unit is mapped to a department explicitly assigned to the current user."
      );
    }

    if (assignment.scope_type === "team" && targetOrgUnit.legacy_team_id && assignment.scope_entity_id === targetOrgUnit.legacy_team_id) {
      addExplicitReasonIfMatch(
        reasons,
        assignment,
        "Explicit team scope",
        "This org unit is mapped to a team explicitly assigned to the current user."
      );
    }
  }

  if (scope.ids.has(orgUnitId) && reasons.length === 0) {
    reasons.push({
      code: "resolved_scope_membership",
      label: "Resolved effective scope",
      source: "context",
      detail: "The org unit is included in the effective scope resolution layer for the current user.",
    });
  }

  return {
    orgUnitId,
    allowed: broadAccess || scope.ids.has(orgUnitId),
    broadAccess,
    reasons: uniqueReasons(reasons),
  };
};
