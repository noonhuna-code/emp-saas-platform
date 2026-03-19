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

