import type { ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope, requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

export type EmployeeListFilters = {
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

export type EmployeeProfile = {
  employee: Record<string, unknown>;
  userProfile: { id: string; full_name: string; avatar_url?: string | null } | null;
  department: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  manager: { id: string; full_name: string } | null;
  personalDetails: EmployeePersonalDetails | null;
  sensitiveData: EmployeeSensitiveData | null;
  documents: EmployeeDocument[];
  familyMembers: EmployeeFamilyMember[];
  skills: EmployeeSkill[];
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

export const listEmployees = async (
  ctx: ServiceContext,
  filters: EmployeeListFilters = {}
): Promise<ServiceResult<{ rows: EmployeeDirectoryRow[]; total: number }>> => {
  try {
    await requireEmployeeModuleEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    const { page, pageSize } = normalizePaging(filters);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = ctx.supabase
      .from("employees")
      .select(
        "id, company_id, user_profile_id, department_id, team_id, manager_id, employment_status, job_level, employee_code, created_at, user_profiles(full_name, avatar_url)",
        { count: "exact" }
      )
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .range(from, to);

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
    requirePermission("manage_employees", ctx);
    assertEmployeeScope(employeeId, ctx);

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

export const getEmployeeProfile = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<ServiceResult<EmployeeProfile>> => {
  try {
    await requireEmployeeModuleEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);

    const { data: employee, error: employeeError } = await ctx.supabase
      .from("employees")
      .select("*")
      .eq("id", employeeId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (employeeError) {
      return { ok: false, error: employeeError.message };
    }

    if (!employee) {
      return { ok: false, error: "Employee not found" };
    }

    const [profileCompletenessScore, personalResult, sensitiveResult, documentsResult, familyResult, skillsResult] =
      await Promise.all([
        readProfileCompleteness(ctx, employeeId),
        ctx.supabase
          .from("employee_personal_details")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .maybeSingle(),
        ctx.supabase
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
          .order("created_at", { ascending: false })
      ]);

    const { data: userProfile } = await ctx.supabase
      .from("user_profiles")
      .select("id, full_name, avatar_url")
      .eq("id", employee.user_profile_id)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    const { data: department } = employee.department_id
      ? await ctx.supabase
          .from("departments")
          .select("id, name")
          .eq("id", employee.department_id)
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

    const { data: team } = employee.team_id
      ? await ctx.supabase
          .from("teams")
          .select("id, name")
          .eq("id", employee.team_id)
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

    const { data: managerEmployee } = employee.manager_id
      ? await ctx.supabase
          .from("employees")
          .select("id, user_profile_id")
          .eq("id", employee.manager_id)
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

    const { data: managerProfile } = managerEmployee?.user_profile_id
      ? await ctx.supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("id", managerEmployee.user_profile_id)
          .eq("company_id", ctx.companyId)
          .is("is_deleted", false)
          .maybeSingle()
      : { data: null };

    return {
      ok: true,
      data: {
        employee: employee as Record<string, unknown>,
        userProfile: userProfile ? { id: userProfile.id, full_name: userProfile.full_name, avatar_url: userProfile.avatar_url } : null,
        department: department ? { id: department.id, name: department.name } : null,
        team: team ? { id: team.id, name: team.name } : null,
        manager: managerProfile ? { id: managerProfile.id, full_name: managerProfile.full_name } : null,
        personalDetails: personalResult.data ? (personalResult.data as EmployeePersonalDetails) : null,
        sensitiveData: sensitiveResult.data ? (sensitiveResult.data as EmployeeSensitiveData) : null,
        documents: (documentsResult.data ?? []) as EmployeeDocument[],
        familyMembers: (familyResult.data ?? []) as EmployeeFamilyMember[],
        skills: (skillsResult.data ?? []) as EmployeeSkill[],
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
    await requireEmployeeModuleEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
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
    await requireEmployeeModuleEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    const { data, error } = await ctx.supabase
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
    await requireEmployeeModuleEntitlement(ctx);
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
    await requireEmployeeModuleEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_documents")
      .insert({ company_id: ctx.companyId, employee_id: employeeId, ...payload })
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
    await requireEmployeeModuleEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { data, error } = await ctx.supabase
      .from("employee_documents")
      .update({ ...payload })
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
    await requireEmployeeModuleEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);

    const { error } = await ctx.supabase
      .from("employee_documents")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userProfileId
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
    await requireEmployeeModuleEntitlement(ctx);
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
    await requireEmployeeModuleEntitlement(ctx);
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
    await requireEmployeeModuleEntitlement(ctx);
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
    await requireEmployeeModuleEntitlement(ctx);
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
    await requireEmployeeModuleEntitlement(ctx);
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
    await requireEmployeeModuleEntitlement(ctx);
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

export type EmployeeLookups = {
  departments: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; department_id?: string | null }>;
  managers: Array<{ id: string; full_name: string }>;
};

export const listEmployeeLookups = async (
  ctx: ServiceContext
): Promise<ServiceResult<EmployeeLookups>> => {
  try {
    await requireEmployeeModuleEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    const [departments, teams, managers] = await Promise.all([
      ctx.supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("name", { ascending: true }),
      ctx.supabase
        .from("teams")
        .select("id, name, department_id")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("name", { ascending: true }),
      ctx.supabase
        .from("employees")
        .select("id, user_profile_id, user_profiles(full_name)")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .order("created_at", { ascending: true })
    ]);

    if (departments.error || teams.error || managers.error) {
      return { ok: false, error: "Unable to load lookups" };
    }

    const managerRows = (managers.data ?? []) as Array<{
      id: string;
      user_profiles?: { full_name?: string | null }[] | { full_name?: string | null } | null;
    }>;

    return {
      ok: true,
      data: {
        departments: (departments.data ?? []) as Array<{ id: string; name: string }>,
        teams: (teams.data ?? []) as Array<{ id: string; name: string; department_id?: string | null }>,
        managers: managerRows.map((row) => {
          const profile = Array.isArray(row.user_profiles) ? row.user_profiles[0] : row.user_profiles;
          return {
            id: row.id,
            full_name: profile?.full_name ?? "Unknown"
          };
        })
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load lookups" };
  }
};
