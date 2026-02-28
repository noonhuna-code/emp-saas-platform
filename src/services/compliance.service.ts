import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";

export type ComplianceControlRow = {
  id: string;
  company_id: string;
  control_id: string;
  domain: string;
  description: string;
  automated_check: string | null;
  last_verified_at: string | null;
  created_at: string;
};

export type ComplianceControlPayload = {
  control_id: string;
  domain: string;
  description: string;
  automated_check?: string | null;
};

export const listComplianceControls = async (
  ctx: ServiceContext
): Promise<ServiceResult<{ controls: ComplianceControlRow[] }>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase
      .from("compliance_controls")
      .select("id, company_id, control_id, domain, description, automated_check, last_verified_at, created_at")
      .eq("company_id", ctx.companyId)
      .order("control_id", { ascending: true });

    if (error) {
      return { ok: false, error: "Failed to load compliance controls" };
    }

    return { ok: true, data: { controls: (data ?? []) as ComplianceControlRow[] } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Compliance controls query failed" };
  }
};

export const addComplianceControl = async (
  ctx: ServiceContext,
  payload: ComplianceControlPayload
): Promise<ServiceResult<ComplianceControlRow>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase
      .from("compliance_controls")
      .insert({
        company_id: ctx.companyId,
        control_id: payload.control_id,
        domain: payload.domain,
        description: payload.description,
        automated_check: payload.automated_check ?? null
      })
      .select("id, company_id, control_id, domain, description, automated_check, last_verified_at, created_at")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: "Failed to create compliance control" };
    }

    return { ok: true, data: data as ComplianceControlRow };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Compliance controls insert failed" };
  }
};
