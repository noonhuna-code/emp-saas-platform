import type { SupabaseClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

export type LoginEventPayload = {
  emailHash: string;
  ipHash: string;
  deviceHash: string | null;
  geoCountry?: string | null;
  success: boolean;
  riskScore: number;
};

export type AccountLockPayload = {
  emailHash: string;
  lockReason: string;
  lockDurationMinutes: number;
  triggeredBy: "rate_limit" | "risk_score";
};

export type MfaTriggerPayload = {
  riskScore: number;
  reason: string;
  status?: "pending" | "resolved" | "ignored";
};

export type SecurityAuditExportRow = {
  event_type: string;
  company_id: string;
  profile_id: string | null;
  risk_score: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

const sanitizeError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  if (message.toLowerCase().includes("permission")) return "Permission denied";
  if (message.includes("JWT")) return "Authentication required";
  return fallback;
};

const requireAuditExportEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.audit_export");
};

export const recordLoginEvent = async (
  ctx: ServiceContext,
  payload: LoginEventPayload
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const { data, error } = await ctx.supabase
      .from("login_events")
      .insert({
        company_id: ctx.companyId,
        profile_id: ctx.userProfileId,
        email_hash: payload.emailHash,
        ip_hash: payload.ipHash,
        device_hash: payload.deviceHash,
        geo_country: payload.geoCountry ?? null,
        success: payload.success,
        risk_score: payload.riskScore
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Login event insert failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Login event insert failed" };
  }
};

export const recordLoginEventAnon = async (
  client: SupabaseClient,
  payload: LoginEventPayload
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const { data, error } = await client
      .from("login_events")
      .insert({
        company_id: null,
        profile_id: null,
        email_hash: payload.emailHash,
        ip_hash: payload.ipHash,
        device_hash: payload.deviceHash,
        geo_country: payload.geoCountry ?? null,
        success: payload.success,
        risk_score: payload.riskScore
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Login event insert failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Login event insert failed" };
  }
};

export const evaluateLoginRisk = async (
  ctx: ServiceContext,
  payload: { ipHash: string; deviceHash: string | null; geoCountry?: string | null }
): Promise<ServiceResult<{ score: number }>> => {
  try {
    const { data, error } = await ctx.supabase.rpc("evaluate_login_risk", {
      p_company_id: ctx.companyId,
      p_profile_id: ctx.userProfileId,
      p_ip_hash: payload.ipHash,
      p_device_hash: payload.deviceHash,
      p_geo_country: payload.geoCountry ?? null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Risk evaluation failed") };
    }

    const score = typeof data === "number" ? data : Number(data ?? 0);
    return { ok: true, data: { score } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Risk evaluation failed" };
  }
};

export const upsertDeviceFingerprint = async (
  ctx: ServiceContext,
  payload: { deviceHash: string; riskScore: number }
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const { data, error } = await ctx.supabase
      .from("device_fingerprints")
      .upsert(
        {
          company_id: ctx.companyId,
          profile_id: ctx.userProfileId,
          device_hash: payload.deviceHash,
          last_seen_at: new Date().toISOString(),
          risk_score: payload.riskScore
        },
        { onConflict: "company_id,profile_id,device_hash" }
      )
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Device fingerprint upsert failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Device fingerprint upsert failed" };
  }
};

export const recordAccountLockEvent = async (
  ctx: ServiceContext,
  payload: AccountLockPayload
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const { data, error } = await ctx.supabase
      .from("account_lock_events")
      .insert({
        company_id: ctx.companyId,
        email_hash: payload.emailHash,
        lock_reason: payload.lockReason,
        lock_duration_minutes: payload.lockDurationMinutes,
        triggered_by: payload.triggeredBy
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Account lock audit insert failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Account lock audit insert failed" };
  }
};

export const recordMfaTrigger = async (
  ctx: ServiceContext,
  payload: MfaTriggerPayload
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const { data, error } = await ctx.supabase.rpc("insert_mfa_trigger_dedup", {
      p_company_id: ctx.companyId,
      p_profile_id: ctx.userProfileId,
      p_risk_score: payload.riskScore,
      p_reason: payload.reason,
      p_status: payload.status ?? "pending",
      p_request_id: ctx.requestId,
      p_window_minutes: 10
    });

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "MFA trigger insert failed") };
    }

    const inserted = (data as { inserted?: boolean; id?: string } | null) ?? {};
    if (!inserted.inserted) {
      return { ok: true, data: { id: inserted.id ?? "" } };
    }
    return { ok: true, data: { id: inserted.id ?? "" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "MFA trigger insert failed" };
  }
};

export const exportSecurityAudit = async (
  ctx: ServiceContext,
  {
    from,
    to,
    limit = 1000
  }: { from?: string; to?: string; limit?: number } = {}
): Promise<ServiceResult<{ rows: SecurityAuditExportRow[] }>> => {
  try {
    await requireAuditExportEntitlement(ctx);
    requirePermission("manage_company", ctx);

    let query = ctx.supabase
      .from("v_security_audit_export")
      .select("event_type, company_id, profile_id, risk_score, details, created_at")
      .eq("company_id", ctx.companyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (from) {
      query = query.gte("created_at", from);
    }
    if (to) {
      query = query.lte("created_at", to);
    }

    const { data, error } = await query;

    if (error) {
      return { ok: false, error: "Security audit export failed" };
    }

    return { ok: true, data: { rows: (data ?? []) as SecurityAuditExportRow[] } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Security audit export failed" };
  }
};

export const recordSecurityExportEvent = async (
  ctx: ServiceContext,
  {
    format,
    rowCount,
    from,
    to
  }: { format: string; rowCount: number; from?: string; to?: string }
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requireAuditExportEntitlement(ctx);
    requirePermission("manage_company", ctx);
    const { data, error } = await ctx.supabase
      .from("security_export_events")
      .insert({
        company_id: ctx.companyId,
        actor_profile_id: ctx.userProfileId,
        export_format: format,
        row_count: rowCount,
        filter_from: from ?? null,
        filter_to: to ?? null
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Security export audit failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Security export audit failed" };
  }
};
