import type { SupabaseClient } from "@supabase/supabase-js";

export type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
  userProfileId: string;
  companyId: string;
  role: string;
  permissions: string[];
  logger: Logger;
};

export type ServiceResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type TransactionRunner = <T>(fn: (client: SupabaseClient) => Promise<T>) => Promise<T>;

export type ServiceContext = AuthContext & {
  requestId: string;
  runInTransaction?: TransactionRunner;
};

export type OrgReportingRelationType =
  | "direct_manager"
  | "dotted_line"
  | "senior_manager"
  | "team_lead"
  | "hr_manager"
  | "payroll_reviewer"
  | "project_manager"
  | "secondary_manager"
  | "acting_manager"
  | "delegate_approver"
  | "skip_level_manager"
  | "functional_manager"
  | "approval_manager"
  | "matrix_manager";

export type OrgUnitCategory =
  | "ownership"
  | "business"
  | "geography"
  | "functional"
  | "workspace"
  | "temporary";

export type OrgUnitStatus = "draft" | "active" | "inactive" | "archived";

export type OrgPositionStatus = "planned" | "active" | "inactive" | "archived";

export type PositionAssignmentType =
  | "primary"
  | "secondary"
  | "dotted_line"
  | "acting"
  | "delegated_approver"
  | "temporary_project";

export type PositionRelationType =
  | "primary_manager"
  | "dotted_line_manager"
  | "secondary_manager"
  | "acting_manager"
  | "skip_level_manager"
  | "functional_manager"
  | "delegate_approver"
  | "approval_escalation"
  | "project_manager";

export type OrganizationFoundationCategoryCount = {
  category: OrgUnitCategory;
  count: number;
};

export type OrganizationFoundationRoleFamily = {
  id: string;
  key: string;
  name: string;
  role_count: number;
  is_system_family: boolean;
};

export type OrganizationFoundationSummary = {
  company_id: string;
  org_unit_count: number;
  mapped_legacy_unit_count: number;
  role_family_count: number;
  job_role_count: number;
  position_count: number;
  active_assignment_count: number;
  approval_delegation_count: number;
  approval_routing_rule_count: number;
  unit_category_counts: OrganizationFoundationCategoryCount[];
  role_families: OrganizationFoundationRoleFamily[];
  supported_relation_types: OrgReportingRelationType[];
};

export type OrganizationAdminLookupOption = {
  id: string;
  label: string;
  secondary_label?: string | null;
};

export type OrganizationAdminOrgUnitType = {
  id: string;
  key: string;
  name: string;
  category: OrgUnitCategory;
  description?: string | null;
  allows_people_assignment: boolean;
  allows_children: boolean;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  is_deleted: boolean;
  company_id?: string | null;
};

export type OrganizationAdminOrgUnit = {
  id: string;
  company_id: string;
  unit_type_key: string;
  unit_type_name?: string | null;
  unit_category?: OrgUnitCategory | null;
  name: string;
  code?: string | null;
  parent_org_unit_id?: string | null;
  parent_org_unit_name?: string | null;
  status: OrgUnitStatus;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
  branch_id?: string | null;
  legacy_department_id?: string | null;
  legacy_team_id?: string | null;
};

export type OrganizationAdminRoleFamily = {
  id: string;
  company_id?: string | null;
  key: string;
  name: string;
  description?: string | null;
  sort_order: number;
  is_system_family: boolean;
  is_deleted: boolean;
};

export type OrganizationAdminJobRole = {
  id: string;
  company_id?: string | null;
  role_family_id: string;
  role_family_name?: string | null;
  role_family_key?: string | null;
  title: string;
  code?: string | null;
  grade_band?: string | null;
  level_code?: string | null;
  employment_type?: string | null;
  management_scope: string;
  is_system_role: boolean;
  is_executive: boolean;
  supervisor_eligible: boolean;
  approver_eligible: boolean;
  delegate_eligible: boolean;
  is_deleted: boolean;
};

export type OrganizationAdminPosition = {
  id: string;
  company_id: string;
  org_unit_id: string;
  org_unit_name?: string | null;
  job_role_id: string;
  job_role_title?: string | null;
  position_code: string;
  title_override?: string | null;
  reports_to_position_id?: string | null;
  reports_to_position_label?: string | null;
  status: OrgPositionStatus;
  is_key_position: boolean;
  is_people_manager: boolean;
  is_approver_position: boolean;
  headcount_limit?: number | null;
  effective_from: string;
  effective_to?: string | null;
  is_deleted: boolean;
};

export type OrganizationAdminPositionRelationship = {
  id: string;
  company_id: string;
  from_position_id: string;
  from_position_label?: string | null;
  to_position_id: string;
  to_position_label?: string | null;
  relation_type: PositionRelationType;
  is_primary: boolean;
  effective_from: string;
  effective_to?: string | null;
  is_deleted: boolean;
};

export type OrganizationAdminEmployeeAssignment = {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name?: string | null;
  employee_code?: string | null;
  position_id: string;
  position_label?: string | null;
  assignment_type: PositionAssignmentType;
  is_primary: boolean;
  allocation_percent: number;
  effective_from: string;
  effective_to?: string | null;
  is_deleted: boolean;
};

export type OrganizationAdminReportingLine = {
  id: string;
  company_id: string;
  employee_id: string;
  employee_name?: string | null;
  manager_employee_id: string;
  manager_name?: string | null;
  relation_type: OrgReportingRelationType;
  is_primary: boolean;
  effective_from: string;
  effective_to?: string | null;
};

export type OrganizationAdminApprovalDelegation = {
  id: string;
  company_id: string;
  delegator_employee_id: string;
  delegator_name?: string | null;
  delegate_employee_id: string;
  delegate_name?: string | null;
  position_id?: string | null;
  position_label?: string | null;
  org_unit_id?: string | null;
  org_unit_name?: string | null;
  module_key?: string | null;
  request_type?: string | null;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  notes?: string | null;
  is_deleted: boolean;
};

export type OrganizationAdminApprovalRoutingRule = {
  id: string;
  company_id: string;
  rule_name: string;
  module_key: string;
  request_type?: string | null;
  subject_org_unit_id?: string | null;
  subject_org_unit_name?: string | null;
  subject_geo_org_unit_id?: string | null;
  subject_geo_org_unit_name?: string | null;
  subject_role_family_id?: string | null;
  subject_role_family_name?: string | null;
  subject_job_role_id?: string | null;
  subject_job_role_title?: string | null;
  subject_grade_band?: string | null;
  approver_position_id?: string | null;
  approver_position_label?: string | null;
  approver_employee_id?: string | null;
  approver_employee_name?: string | null;
  delegate_employee_id?: string | null;
  delegate_employee_name?: string | null;
  step_order: number;
  is_required: boolean;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
  is_deleted: boolean;
};

export type OrganizationUnitDirectoryRow = {
  id: string;
  company_id: string;
  unit_type_key: string;
  unit_type_name: string;
  unit_category: OrgUnitCategory;
  name: string;
  code?: string | null;
  parent_org_unit_id?: string | null;
  parent_org_unit_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  legacy_department_id?: string | null;
  legacy_department_name?: string | null;
  legacy_team_id?: string | null;
  legacy_team_name?: string | null;
  status: OrgUnitStatus;
  is_active: boolean;
  effective_from: string;
  effective_to?: string | null;
};

export type PositionAssignmentSnapshotRow = {
  assignment_id: string;
  company_id: string;
  employee_id: string;
  employee_code?: string | null;
  employee_name: string;
  position_id: string;
  position_code: string;
  position_title: string;
  org_unit_id: string;
  org_unit_name: string;
  unit_type_key: string;
  job_role_id: string;
  job_role_title: string;
  role_family_key: string;
  role_family_name: string;
  assignment_type: PositionAssignmentType;
  is_primary: boolean;
  allocation_percent: number;
  effective_from: string;
  effective_to?: string | null;
};

export type OrganizationAdminLookups = {
  employees: OrganizationAdminLookupOption[];
  org_unit_types: OrganizationAdminLookupOption[];
  org_units: OrganizationAdminLookupOption[];
  role_families: OrganizationAdminLookupOption[];
  job_roles: OrganizationAdminLookupOption[];
  positions: OrganizationAdminLookupOption[];
};

export type OrganizationAdminData = {
  company_id: string;
  identity_reference_strategy: "profile_audit_employee_org";
  org_unit_types: OrganizationAdminOrgUnitType[];
  org_units: OrganizationAdminOrgUnit[];
  role_families: OrganizationAdminRoleFamily[];
  job_roles: OrganizationAdminJobRole[];
  positions: OrganizationAdminPosition[];
  position_relationships: OrganizationAdminPositionRelationship[];
  employee_assignments: OrganizationAdminEmployeeAssignment[];
  reporting_lines: OrganizationAdminReportingLine[];
  approval_delegations: OrganizationAdminApprovalDelegation[];
  approval_routing_rules: OrganizationAdminApprovalRoutingRule[];
  directory: OrganizationUnitDirectoryRow[];
  assignment_snapshot: PositionAssignmentSnapshotRow[];
  lookups: OrganizationAdminLookups;
};

export type EmployeeReportingLineSummary = {
  id: string;
  company_id: string;
  employee_id: string;
  manager_employee_id: string;
  relation_type: OrgReportingRelationType;
  is_primary: boolean;
  effective_from: string;
  effective_to?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  manager?: {
    id: string;
    full_name: string;
    employee_code?: string | null;
  } | null;
};

export type OrganizationDepartmentSummary = {
  id: string;
  name: string;
  code?: string | null;
  parent_department_id?: string | null;
  main_contact_label?: string | null;
  main_contact_email?: string | null;
  main_contact_phone?: string | null;
  head_employee_id?: string | null;
  head?: {
    id: string;
    full_name: string;
    employee_code?: string | null;
  } | null;
  team_count: number;
  employee_count: number;
};

export type OrganizationTeamSummary = {
  id: string;
  name: string;
  department_id?: string | null;
  lead_employee_id?: string | null;
  lead?: {
    id: string;
    full_name: string;
    employee_code?: string | null;
  } | null;
  employee_count: number;
};

export type OrganizationEmployeeSummary = {
  id: string;
  employee_code?: string | null;
  full_name: string;
  designation?: string | null;
  job_level?: string | null;
  employment_status?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  primary_manager_id?: string | null;
  secondary_manager_ids?: string[];
};

export type OrganizationReportingSummary = {
  employee_id: string;
  employee_name: string;
  employee_code?: string | null;
  primary_manager?: {
    id: string;
    full_name: string;
    employee_code?: string | null;
  } | null;
  secondary_managers: Array<{
    id: string;
    full_name: string;
    employee_code?: string | null;
    relation_type: OrgReportingRelationType;
  }>;
  subordinate_count: number;
};

export type OrganizationTreeNode = {
  id: string;
  type: "department" | "team" | "employee";
  label: string;
  parent_id?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  employee_id?: string | null;
  meta?: Record<string, unknown>;
};

export type OrganizationTreeEdge = {
  id?: string;
  from: string;
  to: string;
  relation_type: OrgReportingRelationType | "department_contains" | "team_contains" | null;
  edge_type?: "department_parent" | "department_contains" | "team_contains" | "reporting";
  is_primary?: boolean;
};

export type OrganizationTreePayload = {
  company_id?: string;
  nodes: OrganizationTreeNode[];
  edges: OrganizationTreeEdge[];
};

export type OrganizationOverview = {
  company_id?: string;
  departments: OrganizationDepartmentSummary[];
  teams: OrganizationTeamSummary[];
  employees: OrganizationEmployeeSummary[];
  reporting: OrganizationReportingSummary[];
  tree: OrganizationTreePayload;
  foundation?: OrganizationFoundationSummary | null;
};

