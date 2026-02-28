import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";

export type RetentionPolicyRow = {
  id: string;
  company_id: string;
  table_name: string;
  retention_days: number;
  archive_only: boolean;
  created_at: string;
};

export type RetentionPolicyPayload = {
  table_name: string;
  retention_days: number;
  archive_only?: boolean;
};

export const listRetentionPolicies = async (
  ctx: ServiceContext
): Promise<ServiceResult<{ policies: RetentionPolicyRow[] }>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase
      .from("data_retention_policies")
      .select("id, company_id, table_name, retention_days, archive_only, created_at")
      .eq("company_id", ctx.companyId)
      .order("table_name", { ascending: true });

    if (error) {
      return { ok: false, error: "Failed to load retention policies" };
    }

    return { ok: true, data: { policies: (data ?? []) as RetentionPolicyRow[] } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Retention policy query failed" };
  }
};

export const addRetentionPolicy = async (
  ctx: ServiceContext,
  payload: RetentionPolicyPayload
): Promise<ServiceResult<RetentionPolicyRow>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase
      .from("data_retention_policies")
      .insert({
        company_id: ctx.companyId,
        table_name: payload.table_name,
        retention_days: payload.retention_days,
        archive_only: payload.archive_only ?? true
      })
      .select("id, company_id, table_name, retention_days, archive_only, created_at")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: "Failed to create retention policy" };
    }

    return { ok: true, data: data as RetentionPolicyRow };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Retention policy insert failed" };
  }
};

export const runRetentionEvaluation = async (
  ctx: ServiceContext
): Promise<ServiceResult<Record<string, unknown>>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase.rpc("run_retention_evaluation");
    if (error) {
      return { ok: false, error: "Failed to evaluate retention" };
    }
    return { ok: true, data: (data ?? {}) as Record<string, unknown> };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Retention evaluation failed" };
  }
};

export const runAuthSessionRetention = async (
  ctx: ServiceContext,
  { idleMinutes = 30, absoluteHours = 24 }: { idleMinutes?: number; absoluteHours?: number } = {}
): Promise<ServiceResult<Record<string, unknown>>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase.rpc("run_auth_session_retention", {
      p_idle_minutes: idleMinutes,
      p_absolute_hours: absoluteHours
    });
    if (error) {
      return { ok: false, error: "Failed to run auth session retention" };
    }
    return { ok: true, data: (data ?? {}) as Record<string, unknown> };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Auth session retention failed" };
  }
};

export const runLoginEventsRetentionReport = async (
  ctx: ServiceContext,
  { retentionDays = 365 }: { retentionDays?: number } = {}
): Promise<ServiceResult<Record<string, unknown>>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase.rpc("run_login_events_retention_report", {
      p_retention_days: retentionDays
    });
    if (error) {
      return { ok: false, error: "Failed to run login events retention report" };
    }
    return { ok: true, data: (data ?? {}) as Record<string, unknown> };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Login events retention report failed" };
  }
};
