import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { requireAnyPlanFeature } from "../lib/entitlements";

export type SupervisorFeedbackInput = {
  employeeId: string;
  category: "positive" | "neutral" | "warning";
  feedbackText: string;
  feedbackDate?: string;
};

export type KudosInput = {
  receiverEmployeeId: string;
  points: number;
  message?: string;
};

export type ReliabilityOverviewData = {
  company: Record<string, unknown> | null;
  departments: Array<Record<string, unknown>>;
  ranking: Array<Record<string, unknown>>;
  window_start_date: string | null;
  window_end_date: string | null;
};

export type EmployeeReliabilityCardData = {
  employee_id: string;
  reliability_score: number;
  company_rank: number;
  department_rank?: number | null;
  attendance_percentage: number;
  late_frequency_percentage: number;
  absence_frequency_percentage: number;
  leave_frequency_percentage: number;
  correction_frequency_percentage: number;
  window_start_date?: string | null;
  window_end_date?: string | null;
};

export type KudosLeaderboardData = {
  month_bucket_utc: string | null;
  employees: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
  company: Array<Record<string, unknown>>;
};

const sanitizeError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  if (message.toLowerCase().includes("permission")) return "Permission denied";
  if (message.includes("JWT")) return "Authentication required";
  return fallback;
};

const requireIntelligenceEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requireAnyPlanFeature(ctx, ["feature.analytics_standard", "feature.analytics_advanced"]);
};

const getActorProfileId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const { data } = await client
    .from("user_profiles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  return data?.id ?? null;
};

const getActorEmployeeId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const actorProfileId = await getActorProfileId(client, ctx);

  if (!actorProfileId) {
    return null;
  }

  const { data } = await client
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", actorProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return data?.id ?? null;
};

const ensureManagerOrPermission = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<ServiceResult<null>> => {
  if (ctx.permissions.includes("manage_employees")) {
    return { ok: true, data: null };
  }

  const { data, error } = await ctx.supabase.rpc("current_user_is_manager_of", {
    p_employee_id: employeeId
  });

  if (error) {
    return { ok: false, error: sanitizeError(error.message, "Manager validation failed") };
  }

  if (!data) {
    return { ok: false, error: "Permission denied" };
  }

  return { ok: true, data: null };
};

const getCurrentMonthBucketUtc = (): string => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return monthStart.toISOString().slice(0, 10);
};

export const getReliabilityOverview = async (
  ctx: ServiceContext
): Promise<ServiceResult<ReliabilityOverviewData>> => {
  try {
    await requireIntelligenceEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    const { data: companyRow, error: companyError } = await ctx.supabase
      .from("v_company_reliability_aggregation_90d")
      .select(
        "company_id, window_start_date, window_end_date, employee_count, avg_reliability_score, avg_attendance_percentage, avg_late_frequency_percentage, avg_absence_frequency_percentage, avg_leave_frequency_percentage, avg_correction_frequency_percentage"
      )
      .eq("company_id", ctx.companyId)
      .maybeSingle();

    if (companyError) {
      return { ok: false, error: sanitizeError(companyError.message, "Unable to load reliability summary") };
    }

    const { data: departmentRows, error: departmentError } = await ctx.supabase
      .from("v_department_reliability_aggregation_90d")
      .select(
        "company_id, department_id, window_start_date, window_end_date, employee_count, avg_reliability_score, avg_attendance_percentage, avg_late_frequency_percentage, avg_absence_frequency_percentage, avg_leave_frequency_percentage, avg_correction_frequency_percentage"
      )
      .eq("company_id", ctx.companyId)
      .order("avg_reliability_score", { ascending: false });

    if (departmentError) {
      return { ok: false, error: sanitizeError(departmentError.message, "Unable to load department reliability") };
    }

    const { data: rankingRows, error: rankingError } = await ctx.supabase
      .from("v_employee_reliability_ranking_90d")
      .select(
        "company_id, employee_id, department_id, window_start_date, window_end_date, reliability_score, attendance_percentage, late_frequency_percentage, absence_frequency_percentage, leave_frequency_percentage, correction_frequency_percentage, company_rank, department_rank"
      )
      .eq("company_id", ctx.companyId)
      .order("company_rank", { ascending: true })
      .limit(100);

    if (rankingError) {
      return { ok: false, error: sanitizeError(rankingError.message, "Unable to load reliability ranking") };
    }

    const ranking = (rankingRows ?? []) as Array<Record<string, unknown> & { employee_id?: string }>;
    const employeeIds = ranking.map((row) => row.employee_id as string).filter(Boolean);

    const namesByEmployee = new Map<string, string>();
    if (employeeIds.length > 0) {
      const { data: employeeRows, error: employeeError } = await ctx.supabase
        .from("employees")
        .select("id, user_profile_id, user_profiles(full_name)")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", employeeIds);

      if (employeeError) {
        return { ok: false, error: sanitizeError(employeeError.message, "Unable to load employee names") };
      }

      (employeeRows ?? []).forEach((row) => {
        const profile = row.user_profiles as { full_name?: string | null } | null;
        if (row.id) {
          namesByEmployee.set(row.id as string, profile?.full_name ?? "");
        }
      });
    }

    const mappedRanking = ranking.map((row) => ({
      ...row,
      employee_name: namesByEmployee.get(row.employee_id as string) ?? null
    }));

    return {
      ok: true,
      data: {
        company: companyRow ?? null,
        departments: departmentRows ?? [],
        ranking: mappedRanking,
        window_start_date: (companyRow as { window_start_date?: string } | null)?.window_start_date ?? null,
        window_end_date: (companyRow as { window_end_date?: string } | null)?.window_end_date ?? null
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Reliability overview error" };
  }
};

export const getEmployeeReliabilityCard = async (
  ctx: ServiceContext
): Promise<ServiceResult<{ card: EmployeeReliabilityCardData | null }>> => {
  try {
    await requireIntelligenceEntitlement(ctx);
    requirePermission("manage_employees", ctx);

    const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
    if (!actorEmployeeId) {
      return { ok: false, error: "Employee context required" };
    }

    const { data, error } = await ctx.supabase
      .from("v_employee_reliability_ranking_90d")
      .select(
        "employee_id, reliability_score, company_rank, department_rank, attendance_percentage, late_frequency_percentage, absence_frequency_percentage, leave_frequency_percentage, correction_frequency_percentage, window_start_date, window_end_date"
      )
      .eq("company_id", ctx.companyId)
      .eq("employee_id", actorEmployeeId)
      .maybeSingle();

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Unable to load employee reliability") };
    }

    if (!data) {
      return { ok: true, data: { card: null } };
    }

    return { ok: true, data: { card: data as EmployeeReliabilityCardData } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Employee reliability lookup error" };
  }
};

export const getKudosLeaderboard = async (
  ctx: ServiceContext
): Promise<ServiceResult<KudosLeaderboardData>> => {
  try {
    await requireIntelligenceEntitlement(ctx);
    const monthBucket = getCurrentMonthBucketUtc();

    const { data: employeeRows, error: employeeError } = await ctx.supabase
      .from("v_employee_kudos_monthly_leaderboard")
      .select("company_id, month_bucket_utc, receiver_employee_id, total_points, kudos_count, company_rank")
      .eq("company_id", ctx.companyId)
      .eq("month_bucket_utc", monthBucket)
      .order("company_rank", { ascending: true });

    if (employeeError) {
      return { ok: false, error: sanitizeError(employeeError.message, "Unable to load kudos leaderboard") };
    }

    const receiverIds = (employeeRows ?? [])
      .map((row) => row.receiver_employee_id as string)
      .filter(Boolean);

    const namesByEmployee = new Map<string, string>();
    if (receiverIds.length > 0) {
      const { data: employeeRowsData, error: namesError } = await ctx.supabase
        .from("employees")
        .select("id, user_profile_id, user_profiles(full_name)")
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false)
        .in("id", receiverIds);

      if (namesError) {
        return { ok: false, error: sanitizeError(namesError.message, "Unable to load kudos recipients") };
      }

      (employeeRowsData ?? []).forEach((row) => {
        const profile = row.user_profiles as { full_name?: string | null } | null;
        if (row.id) {
          namesByEmployee.set(row.id as string, profile?.full_name ?? "");
        }
      });
    }

    const mappedEmployees = (employeeRows ?? []).map((row) => ({
      ...row,
      receiver_name: namesByEmployee.get(row.receiver_employee_id as string) ?? null
    }));

    const { data: departmentRows, error: departmentError } = await ctx.supabase
      .from("v_department_kudos_monthly_leaderboard")
      .select("company_id, month_bucket_utc, department_id, total_points, kudos_count, department_rank")
      .eq("company_id", ctx.companyId)
      .eq("month_bucket_utc", monthBucket)
      .order("department_rank", { ascending: true });

    if (departmentError) {
      return { ok: false, error: sanitizeError(departmentError.message, "Unable to load department kudos leaderboard") };
    }

    const { data: companyRows, error: companyError } = await ctx.supabase
      .from("v_company_kudos_monthly_leaderboard")
      .select("company_id, month_bucket_utc, total_points, kudos_count")
      .eq("company_id", ctx.companyId)
      .eq("month_bucket_utc", monthBucket)
      .limit(1);

    if (companyError) {
      return { ok: false, error: sanitizeError(companyError.message, "Unable to load company kudos leaderboard") };
    }

    return {
      ok: true,
      data: {
        month_bucket_utc: monthBucket,
        employees: mappedEmployees,
        departments: departmentRows ?? [],
        company: companyRows ?? []
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kudos leaderboard error" };
  }
};

export const submitSupervisorFeedback = async (
  ctx: ServiceContext,
  payload: SupervisorFeedbackInput
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requireIntelligenceEntitlement(ctx);
    if (!payload.employeeId || !payload.feedbackText?.trim()) {
      return { ok: false, error: "Feedback requires employee and text" };
    }

    if (!payload.category || !["positive", "neutral", "warning"].includes(payload.category)) {
      return { ok: false, error: "Invalid feedback category" };
    }

    const managerCheck = await ensureManagerOrPermission(ctx, payload.employeeId);
    if (!managerCheck.ok) {
      return { ok: false, error: managerCheck.error };
    }

    const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);

    if (!actorEmployeeId) {
      return { ok: false, error: "Employee context required" };
    }

    const { data, error } = await ctx.supabase
      .from("supervisor_feedback")
      .insert({
        company_id: ctx.companyId,
        employee_id: payload.employeeId,
        supervisor_employee_id: actorEmployeeId,
        category: payload.category,
        feedback_text: payload.feedbackText,
        feedback_date: payload.feedbackDate ?? null,
        created_by: actorProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Feedback submission failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Feedback submission error" };
  }
};

export const sendKudos = async (
  ctx: ServiceContext,
  payload: KudosInput
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requireIntelligenceEntitlement(ctx);
    if (!payload.receiverEmployeeId) {
      return { ok: false, error: "Receiver is required" };
    }

    if (!Number.isFinite(payload.points) || payload.points < 1 || payload.points > 50) {
      return { ok: false, error: "Points must be between 1 and 50" };
    }

    const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);

    if (!actorEmployeeId) {
      return { ok: false, error: "Employee context required" };
    }

    if (actorEmployeeId === payload.receiverEmployeeId) {
      return { ok: false, error: "Self-kudos is not allowed" };
    }

    const { data, error } = await ctx.supabase
      .from("employee_kudos")
      .insert({
        company_id: ctx.companyId,
        sender_employee_id: actorEmployeeId,
        receiver_employee_id: payload.receiverEmployeeId,
        points: payload.points,
        message: payload.message ?? null,
        created_by: actorProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Kudos submission failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kudos submission error" };
  }
};

export const listSupervisorFeedback = async (
  ctx: ServiceContext,
  employeeId?: string
): Promise<ServiceResult<{ feedback: Array<Record<string, unknown>> }>> => {
  try {
    await requireIntelligenceEntitlement(ctx);
    let query = ctx.supabase
      .from("supervisor_feedback")
      .select(
        "id, employee_id, supervisor_employee_id, category, feedback_text, feedback_date, created_at, employees!supervisor_feedback_employee_id_fkey(user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId);

    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Feedback lookup failed") };
    }

    return { ok: true, data: { feedback: data ?? [] } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Feedback lookup error" };
  }
};

export const listKudosHistory = async (
  ctx: ServiceContext,
  employeeId?: string
): Promise<ServiceResult<{ kudos: Array<Record<string, unknown>> }>> => {
  try {
    await requireIntelligenceEntitlement(ctx);
    const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
    const targetEmployeeId = employeeId ?? actorEmployeeId;

    if (!targetEmployeeId) {
      return { ok: false, error: "Employee context required" };
    }

    const { data, error } = await ctx.supabase
      .from("employee_kudos")
      .select(
        "id, sender_employee_id, receiver_employee_id, points, message, month_bucket_utc, created_at, employees!employee_kudos_receiver_employee_id_fkey(user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId)
      .or(`sender_employee_id.eq.${targetEmployeeId},receiver_employee_id.eq.${targetEmployeeId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Kudos history failed") };
    }

    return { ok: true, data: { kudos: data ?? [] } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Kudos history error" };
  }
};
