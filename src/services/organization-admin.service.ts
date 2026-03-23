import type {
  OrgReportingRelationType,
  OrgUnitCategory,
  OrganizationAdminApprovalDelegation,
  OrganizationAdminApprovalRoutingRule,
  OrganizationAdminData,
  OrganizationAdminEmployeeAssignment,
  OrganizationAdminJobRole,
  OrganizationAdminLookupOption,
  OrganizationAdminLookups,
  OrganizationAdminOrgUnit,
  OrganizationAdminOrgUnitType,
  OrganizationAdminPosition,
  OrganizationAdminPositionRelationship,
  OrganizationAdminReportingLine,
  OrganizationAdminRoleFamily,
  OrganizationUnitDirectoryRow,
  OrgUnitStatus,
  PositionAssignmentSnapshotRow,
  PositionAssignmentType,
  PositionRelationType,
  OrgPositionStatus,
  ServiceContext,
  ServiceResult,
} from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

type EmployeeLabelRow = {
  id: string;
  employee_code?: string | null;
  user_profile_id?: string | null;
  user_profiles?: { full_name?: string | null }[] | { full_name?: string | null } | null;
};

type AssignmentValidationRow = {
  id: string;
  employee_id: string;
  position_id: string;
  assignment_type: PositionAssignmentType;
  is_primary: boolean;
  allocation_percent: number;
  effective_from: string;
  effective_to?: string | null;
};

type ReportingValidationRow = {
  id: string;
  employee_id: string;
  manager_employee_id: string;
  relation_type: OrgReportingRelationType;
  is_primary: boolean;
  effective_from: string;
  effective_to?: string | null;
};

type DelegationValidationRow = {
  id: string;
  delegator_employee_id: string;
  delegate_employee_id: string;
  position_id?: string | null;
  org_unit_id?: string | null;
  module_key?: string | null;
  request_type?: string | null;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
};

type RoutingValidationRow = {
  id: string;
  module_key: string;
  request_type?: string | null;
  subject_org_unit_id?: string | null;
  subject_geo_org_unit_id?: string | null;
  subject_role_family_id?: string | null;
  subject_job_role_id?: string | null;
  subject_grade_band?: string | null;
  approver_position_id?: string | null;
  approver_employee_id?: string | null;
  delegate_employee_id?: string | null;
  step_order: number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
};

type EmployeeAssignmentEligibilityRow = {
  employee_id: string;
  position_id: string;
  effective_from: string;
  effective_to?: string | null;
};

type PositionEligibilityRow = {
  id: string;
  job_role_id: string;
};

type JobRoleEligibilityRow = {
  id: string;
  approver_eligible: boolean;
  delegate_eligible: boolean;
  supervisor_eligible: boolean;
};

type EmployeeEligibilityState = {
  hasAssignments: boolean;
  positionIds: Set<string>;
  hasApproverEligible: boolean;
  hasDelegateEligible: boolean;
  hasSupervisorEligible: boolean;
};

type SaveAction = "save" | "archive" | "restore" | "delete";

const ORG_READ_PERMISSIONS = [
  "manage_employees",
  "manage_org_structure",
  "manage_positions",
  "manage_reporting_lines",
  "manage_delegations",
  "manage_approval_routing",
] as const;

const POSITION_RELATION_TYPES: PositionRelationType[] = [
  "primary_manager",
  "dotted_line_manager",
  "secondary_manager",
  "acting_manager",
  "skip_level_manager",
  "functional_manager",
  "delegate_approver",
  "approval_escalation",
  "project_manager",
];

const REPORTING_RELATION_TYPES: OrgReportingRelationType[] = [
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

const POSITION_ASSIGNMENT_TYPES: PositionAssignmentType[] = [
  "primary",
  "secondary",
  "dotted_line",
  "acting",
  "delegated_approver",
  "temporary_project",
];

const ORG_UNIT_STATUSES: OrgUnitStatus[] = ["draft", "active", "inactive", "archived"];
const POSITION_STATUSES: OrgPositionStatus[] = ["planned", "active", "inactive", "archived"];
const ORG_UNIT_CATEGORIES: OrgUnitCategory[] = [
  "ownership",
  "business",
  "geography",
  "functional",
  "workspace",
  "temporary",
];

const hasAnyPermission = (ctx: ServiceContext, permissions: readonly string[]): boolean =>
  permissions.some((permission) => ctx.permissions.includes(permission));

const requireOrganizationRead = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_employee_management");
  if (!hasAnyPermission(ctx, ORG_READ_PERMISSIONS)) {
    requirePermission("manage_employees", ctx);
  }
};

const requireOrganizationWrite = async (ctx: ServiceContext, permission: string): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_employee_management");
  requirePermission(permission, ctx);
};

const sanitizeText = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") return fallback;
  return value.trim();
};

const sanitizeNullableText = (value: unknown): string | null => {
  const next = sanitizeText(value);
  return next.length > 0 ? next : null;
};

const sanitizeBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const sanitizeNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeDate = (value: unknown, fallback?: string): string => {
  const next = sanitizeText(value);
  if (!next) return fallback ?? new Date().toISOString().slice(0, 10);
  return next;
};

const sanitizeKey = (value: unknown): string => {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
};

const assertInList = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => {
  return (allowed.includes(value as T) ? value : fallback) as T;
};

const assertEffectiveWindow = (effectiveFrom: string, effectiveTo?: string | null): void => {
  if (effectiveTo && effectiveTo < effectiveFrom) {
    throw new Error("Effective-to date must be on or after effective-from date");
  }
};

const OPEN_ENDED_DATE = "9999-12-31";

const rangesOverlap = (
  leftFrom: string,
  leftTo: string | null | undefined,
  rightFrom: string,
  rightTo: string | null | undefined
): boolean => leftFrom <= (rightTo ?? OPEN_ENDED_DATE) && rightFrom <= (leftTo ?? OPEN_ENDED_DATE);

const sameNullableValue = (left: string | null | undefined, right: string | null | undefined): boolean =>
  (left ?? null) === (right ?? null);

const sameNullableTextCI = (left: string | null | undefined, right: string | null | undefined): boolean =>
  (left?.trim().toLowerCase() ?? null) === (right?.trim().toLowerCase() ?? null);

const createsManagerConflict = (relationType: OrgReportingRelationType, isPrimary: boolean): boolean =>
  isPrimary ||
  [
    "direct_manager",
    "secondary_manager",
    "acting_manager",
    "skip_level_manager",
    "functional_manager",
    "matrix_manager",
    "project_manager",
    "team_lead",
    "senior_manager",
  ].includes(relationType);

const formatEmployeeLabel = (row: EmployeeLabelRow): string => {
  const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
  const fullName = profile?.full_name?.trim();
  if (fullName && row.employee_code) return `${fullName} (${row.employee_code})`;
  return fullName ?? row.employee_code ?? row.id;
};

const loadEmployeeOptions = async (
  ctx: ServiceContext
): Promise<{ labels: Map<string, string>; options: OrganizationAdminLookupOption[] }> => {
  const { data, error } = await ctx.supabase
    .from("employees")
    .select("id, employee_code, user_profile_id, user_profiles(full_name)")
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .order("employee_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as EmployeeLabelRow[];
  const labels = new Map<string, string>();
  const options = rows.map((row) => {
    const label = formatEmployeeLabel(row);
    labels.set(row.id, label);
    return {
      id: row.id,
      label,
      secondary_label: row.employee_code ?? null,
    };
  });

  return { labels, options };
};

const loadAssignmentValidationRows = async (
  ctx: ServiceContext,
  employeeId: string,
  excludeId?: string | null
): Promise<AssignmentValidationRow[]> => {
  let query = ctx.supabase
    .from("employee_position_assignments")
    .select("id, employee_id, position_id, assignment_type, is_primary, allocation_percent, effective_from, effective_to")
    .eq("company_id", ctx.companyId)
    .eq("employee_id", employeeId)
    .is("is_deleted", false);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as AssignmentValidationRow[];
};

const loadAssignmentValidationRowById = async (
  ctx: ServiceContext,
  id: string
): Promise<AssignmentValidationRow | null> => {
  const { data, error } = await ctx.supabase
    .from("employee_position_assignments")
    .select("id, employee_id, position_id, assignment_type, is_primary, allocation_percent, effective_from, effective_to")
    .eq("company_id", ctx.companyId)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data as AssignmentValidationRow;
};

const loadReportingValidationRows = async (
  ctx: ServiceContext,
  employeeIds: string[],
  excludeId?: string | null
): Promise<ReportingValidationRow[]> => {
  const uniqueEmployeeIds = [...new Set(employeeIds.filter(Boolean))];
  if (!uniqueEmployeeIds.length) return [];

  let query = ctx.supabase
    .from("employee_reporting_lines")
    .select("id, employee_id, manager_employee_id, relation_type, is_primary, effective_from, effective_to")
    .eq("company_id", ctx.companyId)
    .in("employee_id", uniqueEmployeeIds);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as ReportingValidationRow[];
};

const loadDelegationValidationRows = async (
  ctx: ServiceContext,
  delegatorEmployeeId: string,
  excludeId?: string | null
): Promise<DelegationValidationRow[]> => {
  let query = ctx.supabase
    .from("approval_delegations")
    .select(
      "id, delegator_employee_id, delegate_employee_id, position_id, org_unit_id, module_key, request_type, effective_from, effective_to, is_active"
    )
    .eq("company_id", ctx.companyId)
    .eq("delegator_employee_id", delegatorEmployeeId)
    .is("is_deleted", false);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DelegationValidationRow[];
};

const loadDelegationValidationRowById = async (
  ctx: ServiceContext,
  id: string
): Promise<DelegationValidationRow | null> => {
  const { data, error } = await ctx.supabase
    .from("approval_delegations")
    .select(
      "id, delegator_employee_id, delegate_employee_id, position_id, org_unit_id, module_key, request_type, effective_from, effective_to, is_active"
    )
    .eq("company_id", ctx.companyId)
    .eq("id", id)
    .is("is_deleted", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data as DelegationValidationRow;
};

const loadRoutingValidationRows = async (
  ctx: ServiceContext,
  moduleKey: string,
  excludeId?: string | null
): Promise<RoutingValidationRow[]> => {
  let query = ctx.supabase
    .from("approval_routing_rules")
    .select(
      "id, module_key, request_type, subject_org_unit_id, subject_geo_org_unit_id, subject_role_family_id, subject_job_role_id, subject_grade_band, approver_position_id, approver_employee_id, delegate_employee_id, step_order, is_active, effective_from, effective_to"
    )
    .eq("company_id", ctx.companyId)
    .eq("module_key", moduleKey)
    .is("is_deleted", false);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as RoutingValidationRow[];
};

const loadRoutingValidationRowById = async (
  ctx: ServiceContext,
  id: string
): Promise<RoutingValidationRow | null> => {
  const { data, error } = await ctx.supabase
    .from("approval_routing_rules")
    .select(
      "id, module_key, request_type, subject_org_unit_id, subject_geo_org_unit_id, subject_role_family_id, subject_job_role_id, subject_grade_band, approver_position_id, approver_employee_id, delegate_employee_id, step_order, is_active, effective_from, effective_to"
    )
    .eq("company_id", ctx.companyId)
    .eq("id", id)
    .is("is_deleted", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  return data as RoutingValidationRow;
};

const loadEmployeeEligibilityStates = async (
  ctx: ServiceContext,
  employeeIds: string[],
  effectiveFrom: string,
  effectiveTo?: string | null
): Promise<Map<string, EmployeeEligibilityState>> => {
  const uniqueEmployeeIds = [...new Set(employeeIds.filter(Boolean))];
  const states = new Map<string, EmployeeEligibilityState>();

  for (const employeeId of uniqueEmployeeIds) {
    states.set(employeeId, {
      hasAssignments: false,
      positionIds: new Set<string>(),
      hasApproverEligible: false,
      hasDelegateEligible: false,
      hasSupervisorEligible: false,
    });
  }

  if (!uniqueEmployeeIds.length) {
    return states;
  }

  const { data: assignmentData, error: assignmentError } = await ctx.supabase
    .from("employee_position_assignments")
    .select("employee_id, position_id, effective_from, effective_to")
    .eq("company_id", ctx.companyId)
    .in("employee_id", uniqueEmployeeIds)
    .is("is_deleted", false);

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  const overlappingAssignments = ((assignmentData ?? []) as EmployeeAssignmentEligibilityRow[]).filter((row) =>
    rangesOverlap(row.effective_from, row.effective_to, effectiveFrom, effectiveTo)
  );

  if (!overlappingAssignments.length) {
    return states;
  }

  const positionIds = [...new Set(overlappingAssignments.map((row) => row.position_id).filter(Boolean))];
  if (!positionIds.length) {
    return states;
  }

  const { data: positionData, error: positionError } = await ctx.supabase
    .from("org_positions")
    .select("id, job_role_id")
    .eq("company_id", ctx.companyId)
    .in("id", positionIds)
    .is("is_deleted", false);

  if (positionError) {
    throw new Error(positionError.message);
  }

  const positionsById = new Map<string, PositionEligibilityRow>(
    ((positionData ?? []) as PositionEligibilityRow[]).map((row) => [row.id, row])
  );

  const jobRoleIds = [
    ...new Set(((positionData ?? []) as PositionEligibilityRow[]).map((row) => row.job_role_id).filter(Boolean)),
  ];
  const jobRolesById = new Map<string, JobRoleEligibilityRow>();

  if (jobRoleIds.length) {
    const { data: jobRoleData, error: jobRoleError } = await ctx.supabase
      .from("job_roles")
      .select("id, approver_eligible, delegate_eligible, supervisor_eligible")
      .in("id", jobRoleIds)
      .is("is_deleted", false);

    if (jobRoleError) {
      throw new Error(jobRoleError.message);
    }

    for (const row of (jobRoleData ?? []) as JobRoleEligibilityRow[]) {
      jobRolesById.set(row.id, row);
    }
  }

  for (const row of overlappingAssignments) {
    const state = states.get(row.employee_id);
    if (!state) continue;

    state.hasAssignments = true;
    state.positionIds.add(row.position_id);

    const jobRoleId = positionsById.get(row.position_id)?.job_role_id;
    const jobRole = jobRoleId ? jobRolesById.get(jobRoleId) : null;

    if (jobRole?.approver_eligible) state.hasApproverEligible = true;
    if (jobRole?.delegate_eligible) state.hasDelegateEligible = true;
    if (jobRole?.supervisor_eligible) state.hasSupervisorEligible = true;
  }

  return states;
};

const validateAssignmentDraft = async (
  ctx: ServiceContext,
  draft: {
    id?: string | null;
    employeeId: string;
    positionId: string;
    isPrimary: boolean;
    allocationPercent: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }
): Promise<void> => {
  if (!draft.employeeId || !draft.positionId) {
    throw new Error("Employee and position are required");
  }

  if (draft.allocationPercent <= 0 || draft.allocationPercent > 100) {
    throw new Error("Allocation percent must be greater than 0 and no more than 100");
  }

  const existingRows = await loadAssignmentValidationRows(ctx, draft.employeeId, draft.id);
  let overlappingAllocation = draft.allocationPercent;

  for (const row of existingRows) {
    if (!rangesOverlap(row.effective_from, row.effective_to, draft.effectiveFrom, draft.effectiveTo)) {
      continue;
    }

    if (row.position_id === draft.positionId) {
      throw new Error("This employee already has an overlapping assignment for the selected position");
    }

    if (draft.isPrimary && row.is_primary) {
      throw new Error("Only one overlapping primary assignment is allowed per employee");
    }

    overlappingAllocation += Number(row.allocation_percent ?? 0);
  }

  if (overlappingAllocation > 100.0001) {
    throw new Error("Overlapping assignments cannot exceed 100% total allocation for an employee");
  }
};

const validateReportingLineDraft = async (
  ctx: ServiceContext,
  draft: {
    id?: string | null;
    employeeId: string;
    managerEmployeeId: string;
    relationType: OrgReportingRelationType;
    isPrimary: boolean;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }
): Promise<void> => {
  if (!draft.employeeId || !draft.managerEmployeeId) {
    throw new Error("Employee and manager are required");
  }

  if (draft.employeeId === draft.managerEmployeeId) {
    throw new Error("An employee cannot report to themselves");
  }

  const existingRows = await loadReportingValidationRows(ctx, [draft.employeeId, draft.managerEmployeeId], draft.id);
  const nextCreatesManagerConflict = createsManagerConflict(draft.relationType, draft.isPrimary);

  for (const row of existingRows) {
    if (!rangesOverlap(row.effective_from, row.effective_to, draft.effectiveFrom, draft.effectiveTo)) {
      continue;
    }

    if (row.employee_id === draft.employeeId) {
      if (row.manager_employee_id === draft.managerEmployeeId && row.relation_type === draft.relationType) {
        throw new Error("This reporting relationship already overlaps for the selected employee, manager, and relation type");
      }

      const currentCreatesManagerConflict = createsManagerConflict(row.relation_type, row.is_primary);
      if (nextCreatesManagerConflict && currentCreatesManagerConflict && row.manager_employee_id !== draft.managerEmployeeId) {
        throw new Error("This employee already has an overlapping manager relationship that conflicts with the selected manager");
      }
    }

    if (
      row.employee_id === draft.managerEmployeeId &&
      row.manager_employee_id === draft.employeeId &&
      createsManagerConflict(row.relation_type, row.is_primary)
    ) {
      throw new Error("This change would create a manager loop between the selected employee and manager");
    }
  }
};

const validateApprovalDelegationDraft = async (
  ctx: ServiceContext,
  draft: {
    id?: string | null;
    delegatorEmployeeId: string;
    delegateEmployeeId: string;
    positionId?: string | null;
    orgUnitId?: string | null;
    moduleKey?: string | null;
    requestType?: string | null;
    effectiveFrom: string;
    effectiveTo?: string | null;
    isActive: boolean;
  }
): Promise<void> => {
  if (!draft.delegatorEmployeeId || !draft.delegateEmployeeId) {
    throw new Error("Delegator and delegate are required");
  }

  if (draft.delegatorEmployeeId === draft.delegateEmployeeId) {
    throw new Error("An employee cannot delegate approval authority to themselves");
  }

  if (draft.isActive) {
    const existingRows = await loadDelegationValidationRows(ctx, draft.delegatorEmployeeId, draft.id);

    for (const row of existingRows) {
      if (!row.is_active) continue;
      if (!rangesOverlap(row.effective_from, row.effective_to, draft.effectiveFrom, draft.effectiveTo)) continue;

      if (
        row.delegate_employee_id === draft.delegateEmployeeId &&
        sameNullableValue(row.position_id, draft.positionId) &&
        sameNullableValue(row.org_unit_id, draft.orgUnitId) &&
        sameNullableTextCI(row.module_key, draft.moduleKey) &&
        sameNullableTextCI(row.request_type, draft.requestType)
      ) {
        throw new Error("An overlapping delegation already exists for the same delegator, delegate, and scope");
      }
    }
  }

  const eligibilityStates = await loadEmployeeEligibilityStates(
    ctx,
    [draft.delegatorEmployeeId, draft.delegateEmployeeId],
    draft.effectiveFrom,
    draft.effectiveTo
  );

  const delegatorState = eligibilityStates.get(draft.delegatorEmployeeId);
  if (draft.positionId && delegatorState?.hasAssignments && !delegatorState.positionIds.has(draft.positionId)) {
    throw new Error("The delegator must hold the scoped position during the delegation window");
  }

  if (delegatorState?.hasAssignments && !delegatorState.hasApproverEligible) {
    throw new Error("The delegator must have an approver-eligible assignment during the delegation window");
  }

  const delegateState = eligibilityStates.get(draft.delegateEmployeeId);
  if (delegateState?.hasAssignments && !delegateState.hasDelegateEligible && !delegateState.hasApproverEligible) {
    throw new Error("The delegate must have a delegate-eligible or approver-eligible assignment during the delegation window");
  }
};

const validateApprovalRoutingRuleDraft = async (
  ctx: ServiceContext,
  draft: {
    id?: string | null;
    moduleKey: string;
    requestType?: string | null;
    subjectOrgUnitId?: string | null;
    subjectGeoOrgUnitId?: string | null;
    subjectRoleFamilyId?: string | null;
    subjectJobRoleId?: string | null;
    subjectGradeBand?: string | null;
    approverPositionId?: string | null;
    approverEmployeeId?: string | null;
    delegateEmployeeId?: string | null;
    stepOrder: number;
    isActive: boolean;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }
): Promise<void> => {
  if (!draft.isActive) {
    return;
  }

  const existingRows = await loadRoutingValidationRows(ctx, draft.moduleKey, draft.id);

  for (const row of existingRows) {
    if (!row.is_active) continue;
    if (!rangesOverlap(row.effective_from, row.effective_to, draft.effectiveFrom, draft.effectiveTo)) continue;

    const sameScope =
      sameNullableTextCI(row.request_type, draft.requestType) &&
      sameNullableValue(row.subject_org_unit_id, draft.subjectOrgUnitId) &&
      sameNullableValue(row.subject_geo_org_unit_id, draft.subjectGeoOrgUnitId) &&
      sameNullableValue(row.subject_role_family_id, draft.subjectRoleFamilyId) &&
      sameNullableValue(row.subject_job_role_id, draft.subjectJobRoleId) &&
      sameNullableTextCI(row.subject_grade_band, draft.subjectGradeBand);

    if (!sameScope) continue;

    if (row.step_order === draft.stepOrder) {
      throw new Error("Another active approval routing rule already uses this step order for the same scope and overlapping date window");
    }

    const sameApproverTarget =
      sameNullableValue(row.approver_position_id, draft.approverPositionId) &&
      sameNullableValue(row.approver_employee_id, draft.approverEmployeeId) &&
      sameNullableValue(row.delegate_employee_id, draft.delegateEmployeeId);

    if (sameApproverTarget) {
      throw new Error("Another active approval routing rule already targets the same scope and approver during the same date window");
    }
  }
};

const loadOrgUnitTypeRows = async (ctx: ServiceContext): Promise<OrganizationAdminOrgUnitType[]> => {
  const { data, error } = await ctx.supabase
    .from("org_unit_types")
    .select(
      "id, key, name, category, description, allows_people_assignment, allows_children, sort_order, is_system, is_active, is_deleted, company_id"
    )
    .or(`company_id.eq.${ctx.companyId},is_system.eq.true`)
    .is("is_deleted", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OrganizationAdminOrgUnitType[];
};

const loadOrgUnitRows = async (ctx: ServiceContext): Promise<OrganizationAdminOrgUnit[]> => {
  const { data, error } = await ctx.supabase
    .from("organization_unit_directory_v1")
    .select(
      "id, company_id, unit_type_key, unit_type_name, unit_category, name, code, parent_org_unit_id, parent_org_unit_name, branch_id, legacy_department_id, legacy_team_id, status, is_active, effective_from, effective_to"
    )
    .eq("company_id", ctx.companyId)
    .order("unit_category", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OrganizationAdminOrgUnit[];
};

const loadRoleFamilyRows = async (ctx: ServiceContext): Promise<OrganizationAdminRoleFamily[]> => {
  const { data, error } = await ctx.supabase
    .from("job_role_families")
    .select("id, company_id, key, name, description, sort_order, is_system_family, is_deleted")
    .or(`company_id.eq.${ctx.companyId},is_system_family.eq.true`)
    .is("is_deleted", false)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as OrganizationAdminRoleFamily[];
};

const loadJobRoleRows = async (
  ctx: ServiceContext,
  familiesById: Map<string, OrganizationAdminRoleFamily>
): Promise<OrganizationAdminJobRole[]> => {
  const { data, error } = await ctx.supabase
    .from("job_roles")
    .select(
      "id, company_id, role_family_id, title, code, grade_band, level_code, employment_type, management_scope, is_system_role, is_executive, supervisor_eligible, approver_eligible, delegate_eligible, is_deleted"
    )
    .or(`company_id.eq.${ctx.companyId},is_system_role.eq.true`)
    .is("is_deleted", false)
    .order("title", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as OrganizationAdminJobRole[]).map((row) => {
    const family = familiesById.get(row.role_family_id);
    return {
      ...row,
      role_family_name: family?.name ?? null,
      role_family_key: family?.key ?? null,
    };
  });
};

const loadPositionRows = async (
  ctx: ServiceContext,
  orgUnitsById: Map<string, OrganizationAdminOrgUnit>,
  jobRolesById: Map<string, OrganizationAdminJobRole>
): Promise<OrganizationAdminPosition[]> => {
  const { data, error } = await ctx.supabase
    .from("org_positions")
    .select(
      "id, company_id, org_unit_id, job_role_id, position_code, title_override, reports_to_position_id, status, is_key_position, is_people_manager, is_approver_position, headcount_limit, effective_from, effective_to, is_deleted"
    )
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .order("position_code", { ascending: true });

  if (error) throw new Error(error.message);

  const baseRows = (data ?? []) as OrganizationAdminPosition[];
  const byId = new Map(baseRows.map((row) => [row.id, row]));

  return baseRows.map((row) => {
    const orgUnit = orgUnitsById.get(row.org_unit_id);
    const jobRole = jobRolesById.get(row.job_role_id);
    const reportsTo = row.reports_to_position_id ? byId.get(row.reports_to_position_id) ?? null : null;
    return {
      ...row,
      org_unit_name: orgUnit?.name ?? null,
      job_role_title: jobRole?.title ?? null,
      reports_to_position_label: reportsTo
        ? `${reportsTo.position_code} · ${reportsTo.title_override ?? jobRolesById.get(reportsTo.job_role_id)?.title ?? "Position"}`
        : null,
    };
  });
};

const loadPositionRelationshipRows = async (
  ctx: ServiceContext,
  positionsById: Map<string, OrganizationAdminPosition>
): Promise<OrganizationAdminPositionRelationship[]> => {
  const { data, error } = await ctx.supabase
    .from("position_relationships")
    .select("id, company_id, from_position_id, to_position_id, relation_type, is_primary, effective_from, effective_to, is_deleted")
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as OrganizationAdminPositionRelationship[]).map((row) => ({
    ...row,
    from_position_label: positionsById.get(row.from_position_id)?.position_code ?? null,
    to_position_label: positionsById.get(row.to_position_id)?.position_code ?? null,
  }));
};

const loadAssignmentRows = async (
  ctx: ServiceContext,
  positionsById: Map<string, OrganizationAdminPosition>
): Promise<OrganizationAdminEmployeeAssignment[]> => {
  const { data, error } = await ctx.supabase
    .from("employee_position_assignments")
    .select("id, company_id, employee_id, position_id, assignment_type, is_primary, allocation_percent, effective_from, effective_to, is_deleted")
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);

  const { labels: employeeLabels } = await loadEmployeeOptions(ctx);
  return ((data ?? []) as OrganizationAdminEmployeeAssignment[]).map((row) => ({
    ...row,
    employee_name: employeeLabels.get(row.employee_id) ?? null,
    position_label: positionsById.get(row.position_id)?.position_code ?? null,
  }));
};

const loadReportingLineRows = async (ctx: ServiceContext): Promise<OrganizationAdminReportingLine[]> => {
  const { data, error } = await ctx.supabase
    .from("employee_reporting_lines")
    .select("id, company_id, employee_id, manager_employee_id, relation_type, is_primary, effective_from, effective_to")
    .eq("company_id", ctx.companyId)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);

  const { labels: employeeLabels } = await loadEmployeeOptions(ctx);
  return ((data ?? []) as OrganizationAdminReportingLine[]).map((row) => ({
    ...row,
    employee_name: employeeLabels.get(row.employee_id) ?? null,
    manager_name: employeeLabels.get(row.manager_employee_id) ?? null,
  }));
};

const loadApprovalDelegationRows = async (
  ctx: ServiceContext,
  orgUnitsById: Map<string, OrganizationAdminOrgUnit>,
  positionsById: Map<string, OrganizationAdminPosition>
): Promise<OrganizationAdminApprovalDelegation[]> => {
  const { data, error } = await ctx.supabase
    .from("approval_delegations")
    .select(
      "id, company_id, delegator_employee_id, delegate_employee_id, position_id, org_unit_id, module_key, request_type, effective_from, effective_to, is_active, notes, is_deleted"
    )
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .order("effective_from", { ascending: false });

  if (error) throw new Error(error.message);

  const { labels: employeeLabels } = await loadEmployeeOptions(ctx);
  return ((data ?? []) as OrganizationAdminApprovalDelegation[]).map((row) => ({
    ...row,
    delegator_name: employeeLabels.get(row.delegator_employee_id) ?? null,
    delegate_name: employeeLabels.get(row.delegate_employee_id) ?? null,
    position_label: row.position_id ? positionsById.get(row.position_id)?.position_code ?? null : null,
    org_unit_name: row.org_unit_id ? orgUnitsById.get(row.org_unit_id)?.name ?? null : null,
  }));
};

const loadApprovalRoutingRows = async (
  ctx: ServiceContext,
  orgUnitsById: Map<string, OrganizationAdminOrgUnit>,
  roleFamiliesById: Map<string, OrganizationAdminRoleFamily>,
  jobRolesById: Map<string, OrganizationAdminJobRole>,
  positionsById: Map<string, OrganizationAdminPosition>
): Promise<OrganizationAdminApprovalRoutingRule[]> => {
  const { data, error } = await ctx.supabase
    .from("approval_routing_rules")
    .select(
      "id, company_id, rule_name, module_key, request_type, subject_org_unit_id, subject_geo_org_unit_id, subject_role_family_id, subject_job_role_id, subject_grade_band, approver_position_id, approver_employee_id, delegate_employee_id, step_order, is_required, is_active, effective_from, effective_to, is_deleted"
    )
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .order("rule_name", { ascending: true })
    .order("step_order", { ascending: true });

  if (error) throw new Error(error.message);

  const { labels: employeeLabels } = await loadEmployeeOptions(ctx);
  return ((data ?? []) as OrganizationAdminApprovalRoutingRule[]).map((row) => ({
    ...row,
    subject_org_unit_name: row.subject_org_unit_id ? orgUnitsById.get(row.subject_org_unit_id)?.name ?? null : null,
    subject_geo_org_unit_name: row.subject_geo_org_unit_id ? orgUnitsById.get(row.subject_geo_org_unit_id)?.name ?? null : null,
    subject_role_family_name: row.subject_role_family_id
      ? roleFamiliesById.get(row.subject_role_family_id)?.name ?? null
      : null,
    subject_job_role_title: row.subject_job_role_id ? jobRolesById.get(row.subject_job_role_id)?.title ?? null : null,
    approver_position_label: row.approver_position_id ? positionsById.get(row.approver_position_id)?.position_code ?? null : null,
    approver_employee_name: row.approver_employee_id ? employeeLabels.get(row.approver_employee_id) ?? null : null,
    delegate_employee_name: row.delegate_employee_id ? employeeLabels.get(row.delegate_employee_id) ?? null : null,
  }));
};

const buildLookups = (
  employees: OrganizationAdminLookupOption[],
  orgUnitTypes: OrganizationAdminOrgUnitType[],
  orgUnits: OrganizationAdminOrgUnit[],
  roleFamilies: OrganizationAdminRoleFamily[],
  jobRoles: OrganizationAdminJobRole[],
  positions: OrganizationAdminPosition[]
): OrganizationAdminLookups => ({
  employees,
  org_unit_types: orgUnitTypes.map((row) => ({
    id: row.id,
    label: row.name,
    secondary_label: row.key,
  })),
  org_units: orgUnits.map((row) => ({
    id: row.id,
    label: row.name,
    secondary_label: row.unit_type_name ?? row.unit_type_key,
  })),
  role_families: roleFamilies.map((row) => ({
    id: row.id,
    label: row.name,
    secondary_label: row.key,
  })),
  job_roles: jobRoles.map((row) => ({
    id: row.id,
    label: row.title,
    secondary_label: row.role_family_name ?? row.role_family_key ?? null,
  })),
  positions: positions.map((row) => ({
    id: row.id,
    label: row.position_code,
    secondary_label: row.title_override ?? row.job_role_title ?? null,
  })),
});

export const getOrganizationAdminData = async (
  ctx: ServiceContext
): Promise<ServiceResult<OrganizationAdminData>> => {
  try {
    await requireOrganizationRead(ctx);

    const employeeOptionsResult = await loadEmployeeOptions(ctx);
    const orgUnitTypes = await loadOrgUnitTypeRows(ctx);
    const orgUnits = await loadOrgUnitRows(ctx);
    const orgUnitsById = new Map(orgUnits.map((row) => [row.id, row]));
    const roleFamilies = await loadRoleFamilyRows(ctx);
    const roleFamiliesById = new Map(roleFamilies.map((row) => [row.id, row]));
    const jobRoles = await loadJobRoleRows(ctx, roleFamiliesById);
    const jobRolesById = new Map(jobRoles.map((row) => [row.id, row]));
    const positions = await loadPositionRows(ctx, orgUnitsById, jobRolesById);
    const positionsById = new Map(positions.map((row) => [row.id, row]));

    const [
      positionRelationships,
      employeeAssignments,
      reportingLines,
      approvalDelegations,
      approvalRoutingRules,
      directoryResult,
      assignmentSnapshotResult,
    ] = await Promise.all([
      loadPositionRelationshipRows(ctx, positionsById),
      loadAssignmentRows(ctx, positionsById),
      loadReportingLineRows(ctx),
      loadApprovalDelegationRows(ctx, orgUnitsById, positionsById),
      loadApprovalRoutingRows(ctx, orgUnitsById, roleFamiliesById, jobRolesById, positionsById),
      ctx.supabase
        .from("organization_unit_directory_v1")
        .select(
          "id, company_id, unit_type_key, unit_type_name, unit_category, name, code, parent_org_unit_id, parent_org_unit_name, branch_id, branch_name, legacy_department_id, legacy_department_name, legacy_team_id, legacy_team_name, status, is_active, effective_from, effective_to"
        )
        .eq("company_id", ctx.companyId)
        .order("unit_category", { ascending: true })
        .order("name", { ascending: true }),
      ctx.supabase
        .from("position_assignment_snapshot_v1")
        .select(
          "assignment_id, company_id, employee_id, employee_code, employee_name, position_id, position_code, position_title, org_unit_id, org_unit_name, unit_type_key, job_role_id, job_role_title, role_family_key, role_family_name, assignment_type, is_primary, allocation_percent, effective_from, effective_to"
        )
        .eq("company_id", ctx.companyId)
        .order("employee_name", { ascending: true }),
    ]);

    if (directoryResult.error) throw new Error(directoryResult.error.message);
    if (assignmentSnapshotResult.error) throw new Error(assignmentSnapshotResult.error.message);

    const lookups = buildLookups(
      employeeOptionsResult.options,
      orgUnitTypes,
      orgUnits,
      roleFamilies,
      jobRoles,
      positions
    );

    return {
      ok: true,
      data: {
        company_id: ctx.companyId,
        identity_reference_strategy: "profile_audit_employee_org",
        org_unit_types: orgUnitTypes,
        org_units: orgUnits,
        role_families: roleFamilies,
        job_roles: jobRoles,
        positions,
        position_relationships: positionRelationships,
        employee_assignments: employeeAssignments,
        reporting_lines: reportingLines,
        approval_delegations: approvalDelegations,
        approval_routing_rules: approvalRoutingRules,
        directory: (directoryResult.data ?? []) as OrganizationUnitDirectoryRow[],
        assignment_snapshot: (assignmentSnapshotResult.data ?? []) as PositionAssignmentSnapshotRow[],
        lookups,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load organization admin data",
    };
  }
};

export const saveOrganizationOrgUnitType = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_org_structure");
    const id = sanitizeNullableText(payload.id);
    if (!id) {
      if (action !== "save") throw new Error("Org unit type not found");
      const insertPayload = {
        company_id: ctx.companyId,
        key: sanitizeKey(payload.key),
        name: sanitizeText(payload.name),
        category: assertInList(sanitizeText(payload.category), ORG_UNIT_CATEGORIES, "functional"),
        description: sanitizeNullableText(payload.description),
        allows_people_assignment: sanitizeBoolean(payload.allows_people_assignment, true),
        allows_children: sanitizeBoolean(payload.allows_children, true),
        sort_order: sanitizeNumber(payload.sort_order, 500),
        is_system: false,
        is_active: sanitizeBoolean(payload.is_active, true),
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId,
      };
      if (!insertPayload.key || !insertPayload.name) {
        throw new Error("Key and name are required");
      }
      const { data, error } = await ctx.supabase.from("org_unit_types").insert(insertPayload).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? {
            is_active: false,
            updated_at: new Date().toISOString(),
            updated_by: ctx.userProfileId,
          }
        : action === "restore"
          ? {
              is_active: true,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            }
          : {
              key: sanitizeKey(payload.key),
              name: sanitizeText(payload.name),
              category: assertInList(sanitizeText(payload.category), ORG_UNIT_CATEGORIES, "functional"),
              description: sanitizeNullableText(payload.description),
              allows_people_assignment: sanitizeBoolean(payload.allows_people_assignment, true),
              allows_children: sanitizeBoolean(payload.allows_children, true),
              sort_order: sanitizeNumber(payload.sort_order, 500),
              is_active: sanitizeBoolean(payload.is_active, true),
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            };

    const { error } = await ctx.supabase
      .from("org_unit_types")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .eq("is_system", false);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save org unit type" };
  }
};

export const saveOrganizationOrgUnit = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_org_structure");
    const id = sanitizeNullableText(payload.id);
    const effectiveFrom = sanitizeDate(payload.effective_from);
    const effectiveTo = sanitizeNullableText(payload.effective_to);
    assertEffectiveWindow(effectiveFrom, effectiveTo);

    if (!id) {
      if (action !== "save") throw new Error("Org unit not found");
      const insertPayload = {
        company_id: ctx.companyId,
        unit_type_key: sanitizeText(payload.unit_type_key),
        name: sanitizeText(payload.name),
        code: sanitizeNullableText(payload.code),
        parent_org_unit_id: sanitizeNullableText(payload.parent_org_unit_id),
        status: assertInList(sanitizeText(payload.status), ORG_UNIT_STATUSES, "active"),
        is_active: sanitizeBoolean(payload.is_active, true),
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId,
      };
      if (!insertPayload.unit_type_key || !insertPayload.name) {
        throw new Error("Name and unit type are required");
      }
      const { data, error } = await ctx.supabase.from("org_units").insert(insertPayload).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? {
            status: "archived",
            is_active: false,
            updated_at: new Date().toISOString(),
            updated_by: ctx.userProfileId,
          }
        : action === "restore"
          ? {
              status: "active",
              is_active: true,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            }
          : {
              unit_type_key: sanitizeText(payload.unit_type_key),
              name: sanitizeText(payload.name),
              code: sanitizeNullableText(payload.code),
              parent_org_unit_id: sanitizeNullableText(payload.parent_org_unit_id),
              status: assertInList(sanitizeText(payload.status), ORG_UNIT_STATUSES, "active"),
              is_active: sanitizeBoolean(payload.is_active, true),
              effective_from: effectiveFrom,
              effective_to: effectiveTo,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            };

    const { error } = await ctx.supabase.from("org_units").update(updatePayload).eq("id", id).eq("company_id", ctx.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save org unit" };
  }
};

export const saveOrganizationRoleFamily = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_positions");
    const id = sanitizeNullableText(payload.id);

    if (!id) {
      if (action !== "save") throw new Error("Role family not found");
      const insertPayload = {
        company_id: ctx.companyId,
        key: sanitizeKey(payload.key),
        name: sanitizeText(payload.name),
        description: sanitizeNullableText(payload.description),
        sort_order: sanitizeNumber(payload.sort_order, 500),
        is_system_family: false,
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId,
        is_deleted: false,
      };
      if (!insertPayload.key || !insertPayload.name) {
        throw new Error("Key and name are required");
      }
      const { data, error } = await ctx.supabase.from("job_role_families").insert(insertPayload).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? {
            is_deleted: true,
            updated_at: new Date().toISOString(),
            updated_by: ctx.userProfileId,
          }
        : action === "restore"
          ? {
              is_deleted: false,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            }
          : {
              key: sanitizeKey(payload.key),
              name: sanitizeText(payload.name),
              description: sanitizeNullableText(payload.description),
              sort_order: sanitizeNumber(payload.sort_order, 500),
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            };

    const { error } = await ctx.supabase
      .from("job_role_families")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .eq("is_system_family", false);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save role family" };
  }
};

export const saveOrganizationJobRole = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_positions");
    const id = sanitizeNullableText(payload.id);

    if (!id) {
      if (action !== "save") throw new Error("Job role not found");
      const insertPayload = {
        company_id: ctx.companyId,
        role_family_id: sanitizeText(payload.role_family_id),
        title: sanitizeText(payload.title),
        code: sanitizeNullableText(payload.code),
        grade_band: sanitizeNullableText(payload.grade_band),
        level_code: sanitizeNullableText(payload.level_code),
        employment_type: sanitizeNullableText(payload.employment_type),
        management_scope: sanitizeText(payload.management_scope) || "individual_contributor",
        is_system_role: false,
        is_executive: sanitizeBoolean(payload.is_executive, false),
        supervisor_eligible: sanitizeBoolean(payload.supervisor_eligible, false),
        approver_eligible: sanitizeBoolean(payload.approver_eligible, false),
        delegate_eligible: sanitizeBoolean(payload.delegate_eligible, false),
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId,
        is_deleted: false,
      };
      if (!insertPayload.role_family_id || !insertPayload.title) {
        throw new Error("Role family and title are required");
      }
      const { data, error } = await ctx.supabase.from("job_roles").insert(insertPayload).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? {
            is_deleted: true,
            updated_at: new Date().toISOString(),
            updated_by: ctx.userProfileId,
          }
        : action === "restore"
          ? {
              is_deleted: false,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            }
          : {
              role_family_id: sanitizeText(payload.role_family_id),
              title: sanitizeText(payload.title),
              code: sanitizeNullableText(payload.code),
              grade_band: sanitizeNullableText(payload.grade_band),
              level_code: sanitizeNullableText(payload.level_code),
              employment_type: sanitizeNullableText(payload.employment_type),
              management_scope: sanitizeText(payload.management_scope) || "individual_contributor",
              is_executive: sanitizeBoolean(payload.is_executive, false),
              supervisor_eligible: sanitizeBoolean(payload.supervisor_eligible, false),
              approver_eligible: sanitizeBoolean(payload.approver_eligible, false),
              delegate_eligible: sanitizeBoolean(payload.delegate_eligible, false),
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            };

    const { error } = await ctx.supabase
      .from("job_roles")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId)
      .eq("is_system_role", false);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save job role" };
  }
};

export const saveOrganizationPosition = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_positions");
    const id = sanitizeNullableText(payload.id);
    const effectiveFrom = sanitizeDate(payload.effective_from);
    const effectiveTo = sanitizeNullableText(payload.effective_to);
    assertEffectiveWindow(effectiveFrom, effectiveTo);

    if (!id) {
      if (action !== "save") throw new Error("Position not found");
      const insertPayload = {
        company_id: ctx.companyId,
        org_unit_id: sanitizeText(payload.org_unit_id),
        job_role_id: sanitizeText(payload.job_role_id),
        position_code: sanitizeText(payload.position_code),
        title_override: sanitizeNullableText(payload.title_override),
        reports_to_position_id: sanitizeNullableText(payload.reports_to_position_id),
        status: assertInList(sanitizeText(payload.status), POSITION_STATUSES, "active"),
        is_key_position: sanitizeBoolean(payload.is_key_position, false),
        is_people_manager: sanitizeBoolean(payload.is_people_manager, false),
        is_approver_position: sanitizeBoolean(payload.is_approver_position, false),
        headcount_limit: sanitizeNullableText(payload.headcount_limit)
          ? sanitizeNumber(payload.headcount_limit)
          : null,
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId,
      };
      if (!insertPayload.org_unit_id || !insertPayload.job_role_id || !insertPayload.position_code) {
        throw new Error("Org unit, job role, and position code are required");
      }
      const { data, error } = await ctx.supabase.from("org_positions").insert(insertPayload).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? {
            status: "archived",
            updated_at: new Date().toISOString(),
            updated_by: ctx.userProfileId,
          }
        : action === "restore"
          ? {
              status: "active",
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            }
          : {
              org_unit_id: sanitizeText(payload.org_unit_id),
              job_role_id: sanitizeText(payload.job_role_id),
              position_code: sanitizeText(payload.position_code),
              title_override: sanitizeNullableText(payload.title_override),
              reports_to_position_id: sanitizeNullableText(payload.reports_to_position_id),
              status: assertInList(sanitizeText(payload.status), POSITION_STATUSES, "active"),
              is_key_position: sanitizeBoolean(payload.is_key_position, false),
              is_people_manager: sanitizeBoolean(payload.is_people_manager, false),
              is_approver_position: sanitizeBoolean(payload.is_approver_position, false),
              headcount_limit: sanitizeNullableText(payload.headcount_limit)
                ? sanitizeNumber(payload.headcount_limit)
                : null,
              effective_from: effectiveFrom,
              effective_to: effectiveTo,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            };

    const { error } = await ctx.supabase.from("org_positions").update(updatePayload).eq("id", id).eq("company_id", ctx.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save position" };
  }
};

export const saveOrganizationPositionRelationship = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_positions");
    const id = sanitizeNullableText(payload.id);
    const effectiveFrom = sanitizeDate(payload.effective_from);
    const effectiveTo = sanitizeNullableText(payload.effective_to);
    assertEffectiveWindow(effectiveFrom, effectiveTo);

    if (!id) {
      if (action !== "save") throw new Error("Position relationship not found");
      const insertPayload = {
        company_id: ctx.companyId,
        from_position_id: sanitizeText(payload.from_position_id),
        to_position_id: sanitizeText(payload.to_position_id),
        relation_type: assertInList(sanitizeText(payload.relation_type), POSITION_RELATION_TYPES, "primary_manager"),
        is_primary: sanitizeBoolean(payload.is_primary, false),
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        created_by: ctx.userProfileId,
      };
      if (!insertPayload.from_position_id || !insertPayload.to_position_id) {
        throw new Error("From and to positions are required");
      }
      const { data, error } = await ctx.supabase.from("position_relationships").insert(insertPayload).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? { is_deleted: true }
        : action === "restore"
          ? { is_deleted: false }
          : {
              from_position_id: sanitizeText(payload.from_position_id),
              to_position_id: sanitizeText(payload.to_position_id),
              relation_type: assertInList(sanitizeText(payload.relation_type), POSITION_RELATION_TYPES, "primary_manager"),
              is_primary: sanitizeBoolean(payload.is_primary, false),
              effective_from: effectiveFrom,
              effective_to: effectiveTo,
            };

    const { error } = await ctx.supabase
      .from("position_relationships")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save position relationship",
    };
  }
};

export const saveOrganizationEmployeeAssignment = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_positions");
    const id = sanitizeNullableText(payload.id);

    if (!id) {
      if (action !== "save") throw new Error("Employee assignment not found");
      const effectiveFrom = sanitizeDate(payload.effective_from);
      const effectiveTo = sanitizeNullableText(payload.effective_to);
      assertEffectiveWindow(effectiveFrom, effectiveTo);
      const assignmentType = assertInList(sanitizeText(payload.assignment_type), POSITION_ASSIGNMENT_TYPES, "primary");
      const insertPayload = {
        company_id: ctx.companyId,
        employee_id: sanitizeText(payload.employee_id),
        position_id: sanitizeText(payload.position_id),
        assignment_type: assignmentType,
        is_primary: assignmentType === "primary" ? true : sanitizeBoolean(payload.is_primary, false),
        allocation_percent: sanitizeNumber(payload.allocation_percent, 100),
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId,
      };
      await validateAssignmentDraft(ctx, {
        employeeId: insertPayload.employee_id,
        positionId: insertPayload.position_id,
        isPrimary: insertPayload.is_primary,
        allocationPercent: insertPayload.allocation_percent,
        effectiveFrom,
        effectiveTo,
      });
      const { data, error } = await ctx.supabase
        .from("employee_position_assignments")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? {
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            deleted_by: ctx.userProfileId,
            updated_at: new Date().toISOString(),
            updated_by: ctx.userProfileId,
          }
        : action === "restore"
          ? {
              is_deleted: false,
              deleted_at: null,
              deleted_by: null,
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            }
          : {
              employee_id: sanitizeText(payload.employee_id),
              position_id: sanitizeText(payload.position_id),
              assignment_type: assertInList(sanitizeText(payload.assignment_type), POSITION_ASSIGNMENT_TYPES, "primary"),
              is_primary: sanitizeBoolean(payload.is_primary, false),
              allocation_percent: sanitizeNumber(payload.allocation_percent, 100),
              effective_from: sanitizeDate(payload.effective_from),
              effective_to: sanitizeNullableText(payload.effective_to),
              updated_at: new Date().toISOString(),
              updated_by: ctx.userProfileId,
            };

    if (action === "restore") {
      const existingRow = await loadAssignmentValidationRowById(ctx, id);
      if (!existingRow) throw new Error("Employee assignment not found");
      await validateAssignmentDraft(ctx, {
        id,
        employeeId: existingRow.employee_id,
        positionId: existingRow.position_id,
        isPrimary: existingRow.is_primary,
        allocationPercent: Number(existingRow.allocation_percent),
        effectiveFrom: existingRow.effective_from,
        effectiveTo: existingRow.effective_to,
      });
    } else if (action === "save") {
      const savePayload = updatePayload as {
        employee_id: string;
        position_id: string;
        assignment_type: PositionAssignmentType;
        is_primary: boolean;
        allocation_percent: number;
        effective_from: string;
        effective_to?: string | null;
      };
      assertEffectiveWindow(savePayload.effective_from, savePayload.effective_to);
      savePayload.is_primary = savePayload.assignment_type === "primary" ? true : savePayload.is_primary;
      await validateAssignmentDraft(ctx, {
        id,
        employeeId: savePayload.employee_id,
        positionId: savePayload.position_id,
        isPrimary: savePayload.is_primary,
        allocationPercent: savePayload.allocation_percent,
        effectiveFrom: savePayload.effective_from,
        effectiveTo: savePayload.effective_to,
      });
    }

    const { error } = await ctx.supabase
      .from("employee_position_assignments")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save employee assignment" };
  }
};

export const saveOrganizationReportingLine = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_reporting_lines");
    const id = sanitizeNullableText(payload.id);
    const effectiveFrom = sanitizeDate(payload.effective_from);
    const effectiveTo = sanitizeNullableText(payload.effective_to);
    assertEffectiveWindow(effectiveFrom, effectiveTo);

    if (!id) {
      if (action !== "save") throw new Error("Reporting line not found");
      const insertPayload = {
        company_id: ctx.companyId,
        employee_id: sanitizeText(payload.employee_id),
        manager_employee_id: sanitizeText(payload.manager_employee_id),
        relation_type: assertInList(sanitizeText(payload.relation_type), REPORTING_RELATION_TYPES, "direct_manager"),
        is_primary: sanitizeBoolean(payload.is_primary, false),
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        created_by: ctx.userProfileId,
      };
      await validateReportingLineDraft(ctx, {
        employeeId: insertPayload.employee_id,
        managerEmployeeId: insertPayload.manager_employee_id,
        relationType: insertPayload.relation_type,
        isPrimary: insertPayload.is_primary,
        effectiveFrom,
        effectiveTo,
      });
      const { data, error } = await ctx.supabase
        .from("employee_reporting_lines")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    if (action === "delete") {
      const { error } = await ctx.supabase
        .from("employee_reporting_lines")
        .delete()
        .eq("id", id)
        .eq("company_id", ctx.companyId);
      if (error) throw new Error(error.message);
      return { ok: true, data: { id } };
    }

    const updatePayload = {
      employee_id: sanitizeText(payload.employee_id),
      manager_employee_id: sanitizeText(payload.manager_employee_id),
      relation_type: assertInList(sanitizeText(payload.relation_type), REPORTING_RELATION_TYPES, "direct_manager"),
      is_primary: sanitizeBoolean(payload.is_primary, false),
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
    };

    await validateReportingLineDraft(ctx, {
      id,
      employeeId: updatePayload.employee_id,
      managerEmployeeId: updatePayload.manager_employee_id,
      relationType: updatePayload.relation_type,
      isPrimary: updatePayload.is_primary,
      effectiveFrom,
      effectiveTo,
    });

    const { error } = await ctx.supabase
      .from("employee_reporting_lines")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save reporting line" };
  }
};

export const saveOrganizationApprovalDelegation = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_delegations");
    const id = sanitizeNullableText(payload.id);

    if (!id) {
      if (action !== "save") throw new Error("Approval delegation not found");
      const effectiveFrom = sanitizeDate(payload.effective_from);
      const effectiveTo = sanitizeNullableText(payload.effective_to);
      assertEffectiveWindow(effectiveFrom, effectiveTo);
      const insertPayload = {
        company_id: ctx.companyId,
        delegator_employee_id: sanitizeText(payload.delegator_employee_id),
        delegate_employee_id: sanitizeText(payload.delegate_employee_id),
        position_id: sanitizeNullableText(payload.position_id),
        org_unit_id: sanitizeNullableText(payload.org_unit_id),
        module_key: sanitizeNullableText(payload.module_key),
        request_type: sanitizeNullableText(payload.request_type),
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        is_active: sanitizeBoolean(payload.is_active, true),
        notes: sanitizeNullableText(payload.notes),
        created_by: ctx.userProfileId,
        is_deleted: false,
      };
      await validateApprovalDelegationDraft(ctx, {
        delegatorEmployeeId: insertPayload.delegator_employee_id,
        delegateEmployeeId: insertPayload.delegate_employee_id,
        positionId: insertPayload.position_id,
        orgUnitId: insertPayload.org_unit_id,
        moduleKey: insertPayload.module_key,
        requestType: insertPayload.request_type,
        effectiveFrom,
        effectiveTo,
        isActive: insertPayload.is_active,
      });
      const { data, error } = await ctx.supabase
        .from("approval_delegations")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? { is_active: false }
        : action === "restore"
          ? { is_active: true }
          : {
              delegator_employee_id: sanitizeText(payload.delegator_employee_id),
              delegate_employee_id: sanitizeText(payload.delegate_employee_id),
              position_id: sanitizeNullableText(payload.position_id),
              org_unit_id: sanitizeNullableText(payload.org_unit_id),
              module_key: sanitizeNullableText(payload.module_key),
              request_type: sanitizeNullableText(payload.request_type),
              effective_from: sanitizeDate(payload.effective_from),
              effective_to: sanitizeNullableText(payload.effective_to),
              is_active: sanitizeBoolean(payload.is_active, true),
              notes: sanitizeNullableText(payload.notes),
            };

    if (action === "restore") {
      const existingRow = await loadDelegationValidationRowById(ctx, id);
      if (!existingRow) throw new Error("Approval delegation not found");
      await validateApprovalDelegationDraft(ctx, {
        id,
        delegatorEmployeeId: existingRow.delegator_employee_id,
        delegateEmployeeId: existingRow.delegate_employee_id,
        positionId: existingRow.position_id,
        orgUnitId: existingRow.org_unit_id,
        moduleKey: existingRow.module_key,
        requestType: existingRow.request_type,
        effectiveFrom: existingRow.effective_from,
        effectiveTo: existingRow.effective_to,
        isActive: true,
      });
    } else if (action === "save") {
      const savePayload = updatePayload as {
        delegator_employee_id: string;
        delegate_employee_id: string;
        position_id?: string | null;
        org_unit_id?: string | null;
        module_key?: string | null;
        request_type?: string | null;
        effective_from: string;
        effective_to?: string | null;
        is_active: boolean;
      };
      assertEffectiveWindow(savePayload.effective_from, savePayload.effective_to);
      await validateApprovalDelegationDraft(ctx, {
        id,
        delegatorEmployeeId: savePayload.delegator_employee_id,
        delegateEmployeeId: savePayload.delegate_employee_id,
        positionId: savePayload.position_id,
        orgUnitId: savePayload.org_unit_id,
        moduleKey: savePayload.module_key,
        requestType: savePayload.request_type,
        effectiveFrom: savePayload.effective_from,
        effectiveTo: savePayload.effective_to,
        isActive: savePayload.is_active,
      });
    }

    const { error } = await ctx.supabase
      .from("approval_delegations")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save approval delegation" };
  }
};

export const saveOrganizationApprovalRoutingRule = async (
  ctx: ServiceContext,
  action: SaveAction,
  payload: Record<string, unknown>
): Promise<ServiceResult<{ id?: string }>> => {
  try {
    await requireOrganizationWrite(ctx, "manage_approval_routing");
    const id = sanitizeNullableText(payload.id);

    if (!id) {
      if (action !== "save") throw new Error("Approval routing rule not found");
      const effectiveFrom = sanitizeDate(payload.effective_from);
      const effectiveTo = sanitizeNullableText(payload.effective_to);
      assertEffectiveWindow(effectiveFrom, effectiveTo);
      const insertPayload = {
        company_id: ctx.companyId,
        rule_name: sanitizeText(payload.rule_name),
        module_key: sanitizeText(payload.module_key),
        request_type: sanitizeNullableText(payload.request_type),
        subject_org_unit_id: sanitizeNullableText(payload.subject_org_unit_id),
        subject_geo_org_unit_id: sanitizeNullableText(payload.subject_geo_org_unit_id),
        subject_role_family_id: sanitizeNullableText(payload.subject_role_family_id),
        subject_job_role_id: sanitizeNullableText(payload.subject_job_role_id),
        subject_grade_band: sanitizeNullableText(payload.subject_grade_band),
        approver_position_id: sanitizeNullableText(payload.approver_position_id),
        approver_employee_id: sanitizeNullableText(payload.approver_employee_id),
        delegate_employee_id: sanitizeNullableText(payload.delegate_employee_id),
        step_order: sanitizeNumber(payload.step_order, 1),
        is_required: sanitizeBoolean(payload.is_required, true),
        is_active: sanitizeBoolean(payload.is_active, true),
        effective_from: effectiveFrom,
        effective_to: effectiveTo,
        created_by: ctx.userProfileId,
        is_deleted: false,
      };
      if (!insertPayload.rule_name || !insertPayload.module_key) {
        throw new Error("Rule name and module key are required");
      }
      if (!insertPayload.approver_position_id && !insertPayload.approver_employee_id) {
        throw new Error("An approver position or approver employee is required");
      }
      await validateApprovalRoutingRuleDraft(ctx, {
        moduleKey: insertPayload.module_key,
        requestType: insertPayload.request_type,
        subjectOrgUnitId: insertPayload.subject_org_unit_id,
        subjectGeoOrgUnitId: insertPayload.subject_geo_org_unit_id,
        subjectRoleFamilyId: insertPayload.subject_role_family_id,
        subjectJobRoleId: insertPayload.subject_job_role_id,
        subjectGradeBand: insertPayload.subject_grade_band,
        approverPositionId: insertPayload.approver_position_id,
        approverEmployeeId: insertPayload.approver_employee_id,
        delegateEmployeeId: insertPayload.delegate_employee_id,
        stepOrder: insertPayload.step_order,
        isActive: insertPayload.is_active,
        effectiveFrom,
        effectiveTo,
      });
      const { data, error } = await ctx.supabase
        .from("approval_routing_rules")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { ok: true, data: { id: data.id as string } };
    }

    const updatePayload =
      action === "archive"
        ? { is_active: false }
        : action === "restore"
          ? { is_active: true }
          : {
              rule_name: sanitizeText(payload.rule_name),
              module_key: sanitizeText(payload.module_key),
              request_type: sanitizeNullableText(payload.request_type),
              subject_org_unit_id: sanitizeNullableText(payload.subject_org_unit_id),
              subject_geo_org_unit_id: sanitizeNullableText(payload.subject_geo_org_unit_id),
              subject_role_family_id: sanitizeNullableText(payload.subject_role_family_id),
              subject_job_role_id: sanitizeNullableText(payload.subject_job_role_id),
              subject_grade_band: sanitizeNullableText(payload.subject_grade_band),
              approver_position_id: sanitizeNullableText(payload.approver_position_id),
              approver_employee_id: sanitizeNullableText(payload.approver_employee_id),
              delegate_employee_id: sanitizeNullableText(payload.delegate_employee_id),
              step_order: sanitizeNumber(payload.step_order, 1),
              is_required: sanitizeBoolean(payload.is_required, true),
              is_active: sanitizeBoolean(payload.is_active, true),
              effective_from: sanitizeDate(payload.effective_from),
              effective_to: sanitizeNullableText(payload.effective_to),
            };

    if (action === "restore") {
      const existingRow = await loadRoutingValidationRowById(ctx, id);
      if (!existingRow) throw new Error("Approval routing rule not found");
      await validateApprovalRoutingRuleDraft(ctx, {
        id,
        moduleKey: existingRow.module_key,
        requestType: existingRow.request_type,
        subjectOrgUnitId: existingRow.subject_org_unit_id,
        subjectGeoOrgUnitId: existingRow.subject_geo_org_unit_id,
        subjectRoleFamilyId: existingRow.subject_role_family_id,
        subjectJobRoleId: existingRow.subject_job_role_id,
        subjectGradeBand: existingRow.subject_grade_band,
        approverPositionId: existingRow.approver_position_id,
        approverEmployeeId: existingRow.approver_employee_id,
        delegateEmployeeId: existingRow.delegate_employee_id,
        stepOrder: existingRow.step_order,
        isActive: true,
        effectiveFrom: existingRow.effective_from,
        effectiveTo: existingRow.effective_to,
      });
    } else if (action === "save") {
      const savePayload = updatePayload as {
        rule_name: string;
        module_key: string;
        request_type?: string | null;
        subject_org_unit_id?: string | null;
        subject_geo_org_unit_id?: string | null;
        subject_role_family_id?: string | null;
        subject_job_role_id?: string | null;
        subject_grade_band?: string | null;
        approver_position_id?: string | null;
        approver_employee_id?: string | null;
        delegate_employee_id?: string | null;
        step_order: number;
        is_active: boolean;
        effective_from: string;
        effective_to?: string | null;
      };
      assertEffectiveWindow(savePayload.effective_from, savePayload.effective_to);
      if (!savePayload.rule_name || !savePayload.module_key) {
        throw new Error("Rule name and module key are required");
      }
      if (!savePayload.approver_position_id && !savePayload.approver_employee_id) {
        throw new Error("An approver position or approver employee is required");
      }
      await validateApprovalRoutingRuleDraft(ctx, {
        id,
        moduleKey: savePayload.module_key,
        requestType: savePayload.request_type,
        subjectOrgUnitId: savePayload.subject_org_unit_id,
        subjectGeoOrgUnitId: savePayload.subject_geo_org_unit_id,
        subjectRoleFamilyId: savePayload.subject_role_family_id,
        subjectJobRoleId: savePayload.subject_job_role_id,
        subjectGradeBand: savePayload.subject_grade_band,
        approverPositionId: savePayload.approver_position_id,
        approverEmployeeId: savePayload.approver_employee_id,
        delegateEmployeeId: savePayload.delegate_employee_id,
        stepOrder: savePayload.step_order,
        isActive: savePayload.is_active,
        effectiveFrom: savePayload.effective_from,
        effectiveTo: savePayload.effective_to,
      });
    }

    const { error } = await ctx.supabase
      .from("approval_routing_rules")
      .update(updatePayload)
      .eq("id", id)
      .eq("company_id", ctx.companyId);
    if (error) throw new Error(error.message);
    return { ok: true, data: { id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to save approval routing rule" };
  }
};
