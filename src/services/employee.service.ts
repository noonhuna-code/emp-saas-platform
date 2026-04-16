import type { EmployeeReportingLineSummary, OrganizationDepartmentSummary, OrganizationReportingSummary, OrganizationTeamSummary, OrgReportingRelationType, ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope, requirePermission } from "../lib/auth-wrapper";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requirePlanFeature } from "../lib/entitlements";
import { assertEmployeeReadAccess, getAccessibleEmployeeScope } from "./access-scope.service";
import { getOrganizationOverview } from "./org-chart.service";

export type EmployeeListFilters = {
  query?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type EmployeeDirectoryRow = {
  id: string;
  company_id: string;
  user_profile_id?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  employment_status?: string | null;
  job_level?: string | null;
  employee_code?: string | null;
  created_at?: string | null;
};

export type EmployeeDetail = {
  employee: Record<string, unknown>;
  profileCompletenessScore: number | null;
};

export type EmployeePersonalDetails = {
  id: string;
  employee_id: string;
  company_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
  phone_number?: string | null;
  alternate_phone?: string | null;
  official_email?: string | null;
  personal_email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  national_id_masked?: string | null;
  passport_number_masked?: string | null;
  tax_id_masked?: string | null;
  bank_account_masked?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeSensitiveData = {
  id: string;
  employee_id: string;
  company_id: string;
  national_id?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  visa_status?: string | null;
  tax_id?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_iban?: string | null;
  bank_branch?: string | null;
  bank_swift?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeDocument = {
  id: string;
  employee_id: string;
  company_id: string;
  document_type: string;
  document_name?: string | null;
  document_number?: string | null;
  file_url?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  storage_mime_type?: string | null;
  storage_size?: number | null;
  storage_checksum?: string | null;
  current_version?: number | null;
  last_uploaded_at?: string | null;
  last_uploaded_by?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeFamilyMember = {
  id: string;
  employee_id: string;
  company_id: string;
  full_name: string;
  relationship: string;
  date_of_birth?: string | null;
  phone_number?: string | null;
  is_dependent?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeSkill = {
  id: string;
  employee_id: string;
  company_id: string;
  skill_name: string;
  proficiency?: string | null;
  years_experience?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeEducation = {
  id: string;
  employee_id: string;
  company_id: string;
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  grade?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeProfile = {
  employee: Record<string, unknown>;
  userProfile: { id: string; full_name: string; avatar_url?: string | null } | null;
  department: { id: string; name: string; main_contact_label?: string | null; main_contact_email?: string | null; main_contact_phone?: string | null } | null;
  team: { id: string; name: string } | null;
  manager: { id: string; full_name: string } | null;
  departmentHead: { id: string; full_name: string; employee_code?: string | null } | null;
  teamLead: { id: string; full_name: string; employee_code?: string | null } | null;
  primaryManager: { id: string; full_name: string; employee_code?: string | null } | null;
  secondaryManagers: Array<{ id: string; full_name: string; employee_code?: string | null; relation_type: OrgReportingRelationType }>;
  reportingLines: EmployeeReportingLineSummary[];
  personalDetails: EmployeePersonalDetails | null;
  sensitiveData: EmployeeSensitiveData | null;
  documents: EmployeeDocument[];
  familyMembers: EmployeeFamilyMember[];
  skills: EmployeeSkill[];
  education: EmployeeEducation[];
  profileCompletenessScore: number | null;
  canViewSensitive: boolean;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const normalizePaging = (filters?: EmployeeListFilters): { page: number; pageSize: number } => {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, filters?.pageSize ?? DEFAULT_PAGE_SIZE));
  return { page, pageSize };
};

const normalizeEmployeeSearchQuery = (value?: string): string => {
  return (value ?? "").trim().toLowerCase().slice(0, 80);
};

const employeeMatchesSearch = (
  row: EmployeeDirectoryRow,
  search: string
): boolean => {
  if (!search) return true;

  const haystacks = [
    row.full_name,
    row.employee_code,
    row.employment_status,
    row.job_level,
  ];

  return haystacks.some((value) => value?.toLowerCase().includes(search));
};

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && data) {
      return data as string;
    }
  } catch {
    // fall through to query
  }

  const { data: employee } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return employee?.id ?? null;
};

const requireSelfOrManageEmployees = async (ctx: ServiceContext, employeeId: string): Promise<boolean> => {
  if (ctx.permissions.includes("manage_employees")) {
    return true;
  }
  const currentEmployeeId = await resolveCurrentEmployeeId(ctx);
  if (!currentEmployeeId || currentEmployeeId !== employeeId) {
    throw new Error("Permission denied");
  }
  return true;
};

const requireEmployeeModuleEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_employee_management");
};

const getAdminEnv = (key: string): string => process.env[key] ?? "";

const createSupabaseAdminClient = (): SupabaseClient => {
  const url = getAdminEnv("SUPABASE_URL") || getAdminEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getAdminEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const maskSensitiveValue = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= 4) return "•".repeat(trimmed.length);
  return `${"•".repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
};

export const listEmployees = async (
  ctx: ServiceContext,
  filters: EmployeeListFilters = {}
): Promise<ServiceResult<{ rows: EmployeeDirectoryRow[]; total: number }>> => {
  try {
    await requireEmployeeModuleEntitlement(ctx);
    const accessScope = await getAccessibleEmployeeScope(ctx);

    const { page, pageSize } = normalizePaging(filters);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const search = normalizeEmployeeSearchQuery(filters.query);

    if (!accessScope.broadAccess && accessScope.ids.size === 0) {
      return {
        ok: true,
        data: {
          rows: [],
          total: 0,
        }
      };
    }

    const selectClause = "id, company_id, user_profile_id, department_id, team_id, manager_id, employment_status, job_level, employee_code, created_at, user_profiles(full_name, avatar_url)";

    if (search) {
      let searchQuery = ctx.supabase
        .from("employees")
        .select(selectClause)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false });

      if (!accessScope.broadAccess) {
        searchQuery = searchQuery.in("id", Array.from(accessScope.ids));
      }

      if (filters.departmentId) {
        searchQuery = searchQuery.eq("department_id", filters.departmentId);
      }

      if (filters.status) {
        searchQuery = searchQuery.eq("employment_status", filters.status);
      }

      const { data, error } = await searchQuery;
      if (error) {
        return { ok: false, error: error.message };
      }

      const rows = (data ?? []).map((row) => {
        const profile = Array.isArray((row as any).user_profiles)
          ? (row as any).user_profiles[0]
          : (row as any).user_profiles;
        return {
          ...row,
          full_name: profile?.full_name ?? null,
          avatar_url: profile?.avatar_url ?? null
        };
      }) as EmployeeDirectoryRow[];

      const filteredRows = rows.filter((row) => employeeMatchesSearch(row, search));

      return {
        ok: true,
        data: {
          rows: filteredRows.slice(from, to + 1),
          total: filteredRows.length
        }
      };
    }

    let query = ctx.supabase
      .from("employees")
      .select(selectClause, { count: "exact" })
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (!accessScope.broadAccess) {
      query = query.in("id", Array.from(accessScope.ids));
    }

    if (filters.departmentId) {
      query = query.eq("department_id", filters.departmentId);
    }

    if (filters.status) {
      query = query.eq("employment_status", filters.status);
    }

    const { data, error, count } = await query;

    if (error) {
      return { ok: false, error: error.message };
    }

    const rows = (data ?? []).map((row) => {
      const profile = Array.isArray((row as any).user_profiles)
        ? (row as any).user_profiles[0]
        : (row as any).user_profiles;
      return {
        ...row,
        full_name: profile?.full_name ?? null,
        avatar_url: profile?.avatar_url ?? null
      };
    }) as EmployeeDirectoryRow[];

    return {
      ok: true,
      data: {
        rows,
        total: count ?? 0
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Employee list error" };
  }
};

const readProfileCompleteness = async (ctx: ServiceContext, employeeId: string): Promise<number | null> => {
  try {
    const rpcResult = await ctx.supabase.rpc("calculate_employee_profile_completeness", {
      p_employee_id: employeeId
    });

    const data = rpcResult.data as unknown;

    if (typeof data === "number") {
      return Math.round(data);
    }

    if (data && typeof data === "object" && "score" in (data as Record<string, unknown>)) {
      const score = (data as Record<string, unknown>).score;
      if (typeof score === "number") {
        return Math.round(score);
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const getEmployeeDetail = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<ServiceResult<EmployeeDetail>> => {
  try {
    await requireEmployeeModuleEntitlement(ctx);
    await assertEmployeeReadAccess(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (error) {
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: false, error: "Employee not found" };
    }

    const profileCompletenessScore = await readProfileCompleteness(ctx, employeeId);

    return {
      ok: true,
      data: {
        employee: data as Record<string, unknown>,
        profileCompletenessScore
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Employee detail error" };
  }
};


type HierarchyIdentity = {
  id: string;
  full_name: string;
  employee_code?: string | null;
};

type ReportingLineRow = {
  id: string;
  company_id: string;
  employee_id: string;
  manager_employee_id: string;
  relation_type: OrgReportingRelationType;
  is_primary: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  created_by: string | null;
};

const getActiveReportingLines = (rows: ReportingLineRow[]): ReportingLineRow[] =>
  rows.filter((row) => !row.effective_to || new Date(row.effective_to) >= new Date(new Date().toDateString()));

const buildIdentitySummary = (
  employee: { id: string; employee_code?: string | null; user_profile_id?: string | null },
  namesByEmployeeId: Map<string, string>
): HierarchyIdentity => ({
  id: employee.id,
  full_name: namesByEmployeeId.get(employee.id) ?? employee.employee_code ?? "Unknown",
  employee_code: employee.employee_code ?? null,
});

const loadDepartmentRow = async (ctx: ServiceContext, departmentId: string | null) => {
  if (!departmentId) {
    return null as { id: string; name: string; main_contact_label?: string | null; main_contact_email?: string | null; main_contact_phone?: string | null; head_employee_id?: string | null } | null;
  }

  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("departments")
    .select("id, name, main_contact_label, main_contact_email, main_contact_phone, head_employee_id")
    .eq("id", departmentId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  if (!error) {
    return (data as { id: string; name: string; main_contact_label?: string | null; main_contact_email?: string | null; main_contact_phone?: string | null; head_employee_id?: string | null } | null) ?? null;
  }

  const fallback = await admin
    .from("departments")
    .select("id, name")
    .eq("id", departmentId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  if (fallback.error) {
    return null;
  }

  return fallback.data
    ? {
        ...(fallback.data as { id: string; name: string }),
        main_contact_label: null,
        main_contact_email: null,
        main_contact_phone: null,
        head_employee_id: null,
      }
      : null;
};

const loadTeamRow = async (ctx: ServiceContext, teamId: string | null) => {
  if (!teamId) {
    return null as { id: string; name: string; team_lead_id?: string | null } | null;
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("teams")
    .select("id, name, team_lead_id")
    .eq("id", teamId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data as { id: string; name: string; team_lead_id?: string | null } | null) ?? null;
};

const loadReportingLinesForEmployee = async (ctx: ServiceContext, employeeId: string): Promise<ReportingLineRow[]> => {
  const { data, error } = await ctx.supabase
    .from("employee_reporting_lines")
    .select(
      "id, company_id, employee_id, manager_employee_id, relation_type, is_primary, effective_from, effective_to, created_at, created_by"
    )
    .eq("company_id", ctx.companyId)
    .eq("employee_id", employeeId);

  if (error) {
    return [];
  }

  return getActiveReportingLines((data ?? []) as ReportingLineRow[]);
};

const loadHierarchyIdentityMap = async (ctx: ServiceContext, employeeIds: string[]): Promise<Map<string, HierarchyIdentity>> => {
  if (!employeeIds.length) {
    return new Map<string, HierarchyIdentity>();
  }

  const { data, error } = await ctx.supabase
    .from("employees")
    .select("id, employee_code, user_profile_id, user_profiles(full_name)")
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .in("id", employeeIds);

  if (error) {
    return new Map<string, HierarchyIdentity>();
  }

  const rows = (data ?? []) as Array<{
    id: string;
    employee_code?: string | null;
    user_profile_id?: string | null;
    user_profiles?: { full_name?: string | null }[] | { full_name?: string | null } | null;
  }>;

  const namesByEmployeeId = new Map<string, string>();
  for (const row of rows) {
    const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
    namesByEmployeeId.set(row.id, profile?.full_name ?? row.employee_code ?? "Unknown");
  }

  return new Map(rows.map((row) => [row.id, buildIdentitySummary(row, namesByEmployeeId)]));
};

const loadDirectManagerIdentity = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<HierarchyIdentity | null> => {
  const { data: managerRow, error } = await ctx.supabase
    .from("employees")
    .select("manager_id")
    .eq("company_id", ctx.companyId)
    .eq("id", employeeId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error || !managerRow?.manager_id) {
    return null;
  }

  const identityMap = await loadHierarchyIdentityMap(ctx, [managerRow.manager_id as string]);
  return identityMap.get(managerRow.manager_id as string) ?? null;
};
export const getEmployeeProfile = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<ServiceResult<EmployeeProfile>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data: employee, error } = await ctx.supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (error || !employee) {
      return { ok: false, error: error?.message ?? "Employee not found" };
    }

    const admin = createSupabaseAdminClient();
    const profileCompletenessPromise = readProfileCompleteness(ctx, employeeId);
    const detailPromises = Promise.all([
      ctx.supabase
        .from("employee_personal_details")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle(),
      admin
        .from("employee_sensitive_data")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle(),
      ctx.supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("employee_family_members")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("employee_skills")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("created_at", { ascending: false }),
      ctx.supabase
        .from("employee_education")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("end_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
    ]);

    const [
      profileCompletenessScore,
      [personalResult, sensitiveResult, documentsResult, familyResult, skillsResult, educationResult],
      userProfileResult,
      department,
      teamResult,
      reportingLines
    ] = await Promise.all([
      profileCompletenessPromise,
      detailPromises,
      ctx.supabase
        .from("user_profiles")
        .select("id, full_name, avatar_url")
        .eq("id", employee.user_profile_id)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .maybeSingle(),
      loadDepartmentRow(ctx, employee.department_id ?? null),
      loadTeamRow(ctx, employee.team_id ?? null),
      loadReportingLinesForEmployee(ctx, employeeId)
    ]);

    const team = teamResult;
    const hierarchyIds = new Set<string>();
    if (employee.manager_id) hierarchyIds.add(employee.manager_id);
    if (department?.head_employee_id) hierarchyIds.add(department.head_employee_id);
    if (team?.team_lead_id) hierarchyIds.add(team.team_lead_id);
    for (const line of reportingLines) {
      hierarchyIds.add(line.manager_employee_id);
    }

    const hierarchyIdentities = await loadHierarchyIdentityMap(ctx, Array.from(hierarchyIds));

    const teamLeadIdentity = team?.team_lead_id ? hierarchyIdentities.get(team.team_lead_id) ?? null : null;
    const explicitPrimaryManager = reportingLines.find((line) => line.is_primary) ?? null;
    const primaryManager = explicitPrimaryManager
      ? hierarchyIdentities.get(explicitPrimaryManager.manager_employee_id) ?? null
      : employee.manager_id
        ? hierarchyIdentities.get(employee.manager_id) ?? null
        : null;
    const escalatedManager =
      teamLeadIdentity && (!primaryManager || primaryManager.id === teamLeadIdentity.id)
        ? await loadDirectManagerIdentity(ctx, teamLeadIdentity.id)
        : null;

    const secondaryManagers = reportingLines
      .filter((line) => !line.is_primary)
      .map((line) => {
        const manager = hierarchyIdentities.get(line.manager_employee_id);
        if (!manager) {
          return null;
        }
        return {
          ...manager,
          relation_type: line.relation_type,
        };
      })
      .filter((manager): manager is NonNullable<typeof manager> => Boolean(manager));

    const reportingLineSummaries: EmployeeReportingLineSummary[] = reportingLines.map((line) => ({
      id: line.id,
      company_id: line.company_id,
      employee_id: line.employee_id,
      manager_employee_id: line.manager_employee_id,
      relation_type: line.relation_type,
      is_primary: line.is_primary,
      effective_from: line.effective_from,
      effective_to: line.effective_to,
      created_at: line.created_at,
      created_by: line.created_by,
      manager: hierarchyIdentities.get(line.manager_employee_id)
        ? {
            id: line.manager_employee_id,
            full_name: hierarchyIdentities.get(line.manager_employee_id)!.full_name,
            employee_code: hierarchyIdentities.get(line.manager_employee_id)!.employee_code ?? null,
          }
        : null,
    }));

    const managerSummary = escalatedManager
      ? { id: escalatedManager.id, full_name: escalatedManager.full_name }
      : primaryManager
        ? { id: primaryManager.id, full_name: primaryManager.full_name }
        : null;
    const personalDetails = personalResult.data
      ? ({
          ...(personalResult.data as EmployeePersonalDetails),
          national_id_masked:
            (personalResult.data as EmployeePersonalDetails).national_id_masked ??
            maskSensitiveValue((sensitiveResult.data as EmployeeSensitiveData | null)?.national_id ?? null),
          passport_number_masked:
            (personalResult.data as EmployeePersonalDetails).passport_number_masked ??
            maskSensitiveValue((sensitiveResult.data as EmployeeSensitiveData | null)?.passport_number ?? null),
          tax_id_masked:
            (personalResult.data as EmployeePersonalDetails).tax_id_masked ??
            maskSensitiveValue((sensitiveResult.data as EmployeeSensitiveData | null)?.tax_id ?? null),
          bank_account_masked:
            (personalResult.data as EmployeePersonalDetails).bank_account_masked ??
            maskSensitiveValue((sensitiveResult.data as EmployeeSensitiveData | null)?.bank_account_number ?? null),
        } satisfies EmployeePersonalDetails)
      : null;

    return {
      ok: true,
      data: {
        employee: employee as Record<string, unknown>,
        userProfile: userProfileResult.data
          ? {
              id: userProfileResult.data.id,
              full_name: userProfileResult.data.full_name,
              avatar_url: userProfileResult.data.avatar_url,
            }
          : null,
        department: department
          ? {
              id: department.id,
              name: department.name,
              main_contact_label: department.main_contact_label ?? null,
              main_contact_email: department.main_contact_email ?? null,
              main_contact_phone: department.main_contact_phone ?? null,
            }
          : null,
        team: team ? { id: team.id, name: team.name } : null,
        manager: managerSummary,
        departmentHead: department?.head_employee_id ? hierarchyIdentities.get(department.head_employee_id) ?? null : null,
        teamLead: teamLeadIdentity,
        primaryManager,
        secondaryManagers,
        reportingLines: reportingLineSummaries,
        personalDetails,
        sensitiveData: sensitiveResult.data ? (sensitiveResult.data as EmployeeSensitiveData) : null,
        documents: (documentsResult.data ?? []) as EmployeeDocument[],
        familyMembers: (familyResult.data ?? []) as EmployeeFamilyMember[],
        skills: (skillsResult.data ?? []) as EmployeeSkill[],
        education: (educationResult.data ?? []) as EmployeeEducation[],
        profileCompletenessScore,
        canViewSensitive: ctx.permissions.includes("manage_employees")
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Employee profile error" };
  }
};

export type PersonalDetailsInput = Omit<EmployeePersonalDetails, "id" | "employee_id" | "company_id" | "created_at" | "updated_at">;

export const upsertEmployeePersonalDetails = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: PersonalDetailsInput
): Promise<ServiceResult<EmployeePersonalDetails>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("employee_personal_details")
      .upsert(
        {
          company_id: ctx.companyId,
          employee_id: employeeId,
          ...payload
        },
        { onConflict: "company_id,employee_id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Personal details update failed" };
    }

    return { ok: true, data: data as EmployeePersonalDetails };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Personal details update failed" };
  }
};

export type SensitiveDataInput = Omit<EmployeeSensitiveData, "id" | "employee_id" | "company_id" | "created_at" | "updated_at">;

export const upsertEmployeeSensitiveData = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: SensitiveDataInput
): Promise<ServiceResult<EmployeeSensitiveData>> => {
  try {
    requirePermission("manage_employees", ctx);

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("employee_sensitive_data")
      .upsert(
        {
          company_id: ctx.companyId,
          employee_id: employeeId,
          ...payload
        },
        { onConflict: "company_id,employee_id" }
      )
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Sensitive data update failed" };
    }

    return { ok: true, data: data as EmployeeSensitiveData };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sensitive data update failed" };
  }
};

export type EmploymentInfoInput = Partial<{
  department_id: string | null;
  team_id: string | null;
  manager_id: string | null;
  designation: string | null;
  job_level: string | null;
  employment_type: string | null;
  work_mode: string | null;
  employment_status: string | null;
  confirmation_date: string | null;
  probation_end_date: string | null;
  exit_date: string | null;
  termination_reason: string | null;
  employee_code: string | null;
  profile_image_url: string | null;
}>;

export const updateEmployeeEmploymentInfo = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: EmploymentInfoInput
): Promise<ServiceResult<Record<string, unknown>>> => {
  try {
    requirePermission("manage_employees", ctx);
    assertEmployeeScope(employeeId, ctx);

    const { data, error } = await ctx.supabase
      .from("employees")
      .update({ ...payload })
      .eq("id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Employment info update failed" };
    }

    return { ok: true, data: data as Record<string, unknown> };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Employment info update failed" };
  }
};

export type EmployeeDocumentInput = {
  document_type: string;
  document_name?: string | null;
  document_number?: string | null;
  file_url?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  status?: string | null;
};

export const addEmployeeDocument = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: EmployeeDocumentInput
): Promise<ServiceResult<EmployeeDocument>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("employee_documents")
      .insert({ company_id: ctx.companyId, employee_id: employeeId, created_by: ctx.userProfileId, updated_by: ctx.userProfileId, ...payload })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Document create failed" };
    }

    return { ok: true, data: data as EmployeeDocument };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Document create failed" };
  }
};

export const updateEmployeeDocument = async (
  ctx: ServiceContext,
  employeeId: string,
  documentId: string,
  payload: EmployeeDocumentInput
): Promise<ServiceResult<EmployeeDocument>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);
    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("employee_documents")
      .update({ ...payload, updated_by: ctx.userProfileId, updated_at: new Date().toISOString() })
      .eq("id", documentId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Document update failed" };
    }

    return { ok: true, data: data as EmployeeDocument };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Document update failed" };
  }
};

export const deleteEmployeeDocument = async (
  ctx: ServiceContext,
  employeeId: string,
  documentId: string
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);
    const admin = createSupabaseAdminClient();

    const { error } = await admin
      .from("employee_documents")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userProfileId,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userProfileId,
      })
      .eq("id", documentId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { id: documentId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Document delete failed" };
  }
};

export type EmployeeFamilyInput = Omit<EmployeeFamilyMember, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">;

export const addEmployeeFamilyMember = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: EmployeeFamilyInput
): Promise<ServiceResult<EmployeeFamilyMember>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_family_members")
      .insert({ company_id: ctx.companyId, employee_id: employeeId, ...payload })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Family member create failed" };
    }

    return { ok: true, data: data as EmployeeFamilyMember };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Family member create failed" };
  }
};

export const updateEmployeeFamilyMember = async (
  ctx: ServiceContext,
  employeeId: string,
  memberId: string,
  payload: EmployeeFamilyInput
): Promise<ServiceResult<EmployeeFamilyMember>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_family_members")
      .update({ ...payload })
      .eq("id", memberId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Family member update failed" };
    }

    return { ok: true, data: data as EmployeeFamilyMember };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Family member update failed" };
  }
};

export const deleteEmployeeFamilyMember = async (
  ctx: ServiceContext,
  employeeId: string,
  memberId: string
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { error } = await ctx.supabase
      .from("employee_family_members")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userProfileId
      })
      .eq("id", memberId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { id: memberId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Family member delete failed" };
  }
};

export type EmployeeSkillInput = Omit<EmployeeSkill, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">;

export const addEmployeeSkill = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: EmployeeSkillInput
): Promise<ServiceResult<EmployeeSkill>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_skills")
      .insert({ company_id: ctx.companyId, employee_id: employeeId, ...payload })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Skill create failed" };
    }

    return { ok: true, data: data as EmployeeSkill };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Skill create failed" };
  }
};

export const updateEmployeeSkill = async (
  ctx: ServiceContext,
  employeeId: string,
  skillId: string,
  payload: EmployeeSkillInput
): Promise<ServiceResult<EmployeeSkill>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_skills")
      .update({ ...payload })
      .eq("id", skillId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Skill update failed" };
    }

    return { ok: true, data: data as EmployeeSkill };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Skill update failed" };
  }
};

export const deleteEmployeeSkill = async (
  ctx: ServiceContext,
  employeeId: string,
  skillId: string
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { error } = await ctx.supabase
      .from("employee_skills")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userProfileId
      })
      .eq("id", skillId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { id: skillId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Skill delete failed" };
  }
};

export type EmployeeEducationInput = Omit<EmployeeEducation, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">;

export const addEmployeeEducation = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: EmployeeEducationInput
): Promise<ServiceResult<EmployeeEducation>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_education")
      .insert({ company_id: ctx.companyId, employee_id: employeeId, ...payload })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Qualification create failed" };
    }

    return { ok: true, data: data as EmployeeEducation };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Qualification create failed" };
  }
};

export const updateEmployeeEducation = async (
  ctx: ServiceContext,
  employeeId: string,
  educationId: string,
  payload: EmployeeEducationInput
): Promise<ServiceResult<EmployeeEducation>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_education")
      .update({ ...payload })
      .eq("id", educationId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Qualification update failed" };
    }

    return { ok: true, data: data as EmployeeEducation };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Qualification update failed" };
  }
};

export const deleteEmployeeEducation = async (
  ctx: ServiceContext,
  employeeId: string,
  educationId: string
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { error } = await ctx.supabase
      .from("employee_education")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userProfileId
      })
      .eq("id", educationId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { id: educationId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Qualification delete failed" };
  }
};

export type EmployeeLookups = {
  departments: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; department_id?: string | null }>;
  managers: Array<{ id: string; full_name: string }>;
  departmentHeads: Array<{ id: string; full_name: string; department_id?: string | null }>;
  teamLeads: Array<{ id: string; full_name: string; team_id?: string | null }>;
};

export const listEmployeeLookups = async (
  ctx: ServiceContext
): Promise<ServiceResult<EmployeeLookups>> => {
  try {
    const accessScope = await getAccessibleEmployeeScope(ctx);
    const admin = createSupabaseAdminClient();

    if (!accessScope.broadAccess && accessScope.ids.size === 0) {
      return {
        ok: true,
        data: {
          departments: [],
          teams: [],
          managers: [],
          departmentHeads: [],
          teamLeads: [],
        }
      };
    }

      const [departmentsResult, teams, managers] = await Promise.all([
        admin
          .from("departments")
          .select("id, name, head_employee_id")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .order("name", { ascending: true }),
        admin
          .from("teams")
          .select("id, name, department_id, team_lead_id")
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .order("name", { ascending: true }),
        admin
          .from("employees")
          .select("id, employee_code, user_profile_id, department_id, team_id, user_profiles(full_name)")
          .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", accessScope.broadAccess ? ["00000000-0000-0000-0000-000000000000"] : Array.from(accessScope.ids))
        .order("created_at", { ascending: true })
    ]);

      let departmentsData = departmentsResult.data as Array<{ id: string; name: string; head_employee_id?: string | null }> | null;
      if (departmentsResult.error) {
        const fallbackDepartments = await admin
          .from("departments")
          .select("id, name")
          .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("name", { ascending: true });
      if (fallbackDepartments.error || teams.error || managers.error) {
        return { ok: false, error: "Unable to load lookups" };
      }
      departmentsData = ((fallbackDepartments.data ?? []) as Array<{ id: string; name: string }>).map((department) => ({
        ...department,
        head_employee_id: null,
      }));
    }

    if (teams.error || managers.error) {
      return { ok: false, error: "Unable to load lookups" };
    }

      const managerResult = accessScope.broadAccess
        ? await admin
            .from("employees")
            .select("id, employee_code, user_profile_id, department_id, team_id, user_profiles(full_name)")
            .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .order("created_at", { ascending: true })
      : managers;

    if (managerResult.error) {
      return { ok: false, error: "Unable to load lookups" };
    }

    const managerRows = (managerResult.data ?? []) as Array<{
      id: string;
      employee_code?: string | null;
      department_id?: string | null;
      team_id?: string | null;
      user_profiles?: { full_name?: string | null }[] | { full_name?: string | null } | null;
    }>;

    const fullNameByEmployeeId = new Map<string, string>();
    for (const row of managerRows) {
      const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
      fullNameByEmployeeId.set(row.id, profile?.full_name ?? row.employee_code ?? "Unknown");
    }

    const teamRows = (teams.data ?? []) as Array<{ id: string; name: string; department_id?: string | null; team_lead_id?: string | null }>;
    const visibleDepartmentIds = new Set(managerRows.map((row) => row.department_id).filter((value): value is string => Boolean(value)));
    const visibleTeamIds = new Set(managerRows.map((row) => row.team_id).filter((value): value is string => Boolean(value)));
    const departmentRows = (departmentsData ?? []).filter((department) => accessScope.broadAccess || visibleDepartmentIds.has(department.id));
    const visibleTeamRows = teamRows.filter((team) => accessScope.broadAccess || visibleTeamIds.has(team.id));

    return {
      ok: true,
      data: {
        departments: departmentRows.map((department) => ({ id: department.id, name: department.name })),
        teams: visibleTeamRows.map((team) => ({ id: team.id, name: team.name, department_id: team.department_id ?? null })),
        managers: managerRows.map((row) => ({
          id: row.id,
          full_name: fullNameByEmployeeId.get(row.id) ?? "Unknown"
        })),
        departmentHeads: departmentRows
          .filter((department) => Boolean(department.head_employee_id))
          .map((department) => ({
            id: department.head_employee_id!,
            full_name: fullNameByEmployeeId.get(department.head_employee_id!) ?? "Unknown",
            department_id: department.id,
          })),
        teamLeads: visibleTeamRows
          .filter((team) => Boolean(team.team_lead_id))
          .map((team) => ({
            id: team.team_lead_id!,
            full_name: fullNameByEmployeeId.get(team.team_lead_id!) ?? "Unknown",
            team_id: team.id,
          })),
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load lookups" };
  }
};

export const listDepartmentSummaries = async (
  ctx: ServiceContext
): Promise<ServiceResult<OrganizationDepartmentSummary[]>> => {
  const overview = await getOrganizationOverview(ctx);
  if (!overview.ok || !overview.data) {
    return { ok: false, error: overview.error ?? "Unable to load department summaries" };
  }
  return { ok: true, data: overview.data.departments };
};

export const listTeamSummaries = async (
  ctx: ServiceContext,
  departmentId?: string
): Promise<ServiceResult<OrganizationTeamSummary[]>> => {
  const overview = await getOrganizationOverview(ctx);
  if (!overview.ok || !overview.data) {
    return { ok: false, error: overview.error ?? "Unable to load team summaries" };
  }
  return {
    ok: true,
    data: departmentId
      ? overview.data.teams.filter((team) => team.department_id === departmentId)
      : overview.data.teams,
  };
};

export const getEmployeeReportingSummary = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<ServiceResult<OrganizationReportingSummary | null>> => {
  try {
    await requireEmployeeModuleEntitlement(ctx);
    await assertEmployeeReadAccess(ctx, employeeId);

    const overview = await getOrganizationOverview(ctx);
    if (!overview.ok || !overview.data) {
      return { ok: false, error: overview.error ?? "Unable to load reporting summary" };
    }

    return {
      ok: true,
      data: overview.data.reporting.find((summary) => summary.employee_id === employeeId) ?? null,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load reporting summary" };
  }
};

export const listEmployeeSubordinates = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<ServiceResult<Array<{ id: string; full_name: string; employee_code?: string | null; relation_type: OrgReportingRelationType; is_primary: boolean }>>> => {
  try {
    await requireEmployeeModuleEntitlement(ctx);
    await assertEmployeeReadAccess(ctx, employeeId);

    const overview = await getOrganizationOverview(ctx);
    if (!overview.ok || !overview.data) {
      return { ok: false, error: overview.error ?? "Unable to load subordinates" };
    }

    const subordinates = overview.data.reporting.flatMap((summary: OrganizationReportingSummary) => {
      const matchesPrimary = summary.primary_manager?.id === employeeId;
      const matchesSecondary = summary.secondary_managers.filter((manager: OrganizationReportingSummary['secondary_managers'][number]) => manager.id === employeeId);
      if (!matchesPrimary && !matchesSecondary.length) {
        return [];
      }
      const rows: Array<{ id: string; full_name: string; employee_code?: string | null; relation_type: OrgReportingRelationType; is_primary: boolean }> = [];
      if (matchesPrimary) {
        rows.push({
          id: summary.employee_id,
          full_name: summary.employee_name,
          employee_code: summary.employee_code ?? null,
          relation_type: "direct_manager",
          is_primary: true,
        });
      }
      for (const manager of matchesSecondary) {
        rows.push({
          id: summary.employee_id,
          full_name: summary.employee_name,
          employee_code: summary.employee_code ?? null,
          relation_type: manager.relation_type,
          is_primary: false,
        });
      }
      return rows;
    });

    return { ok: true, data: subordinates };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load subordinates" };
  }
};
