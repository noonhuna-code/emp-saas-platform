import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";

export type SecurityTestEventRow = {
  id: string;
  company_id: string;
  category: string;
  test_name: string;
  result: string;
  notes: string | null;
  executed_at: string;
  created_at: string;
};

export type SecurityTestEventPayload = {
  category: string;
  test_name: string;
  result: string;
  notes?: string | null;
  executed_at?: string;
};

export const listSecurityTestEvents = async (
  ctx: ServiceContext,
  { sinceDays = 30 }: { sinceDays?: number } = {}
): Promise<ServiceResult<{ events: SecurityTestEventRow[] }>> => {
  try {
    requirePermission("manage_roles", ctx);
    const sinceIso = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await ctx.supabase
      .from("security_test_events")
      .select("id, company_id, category, test_name, result, notes, executed_at, created_at")
      .eq("company_id", ctx.companyId)
      .gte("executed_at", sinceIso)
      .order("executed_at", { ascending: false });

    if (error) {
      return { ok: false, error: "Failed to load security test events" };
    }

    return { ok: true, data: { events: (data ?? []) as SecurityTestEventRow[] } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Security audit query failed" };
  }
};

export const addSecurityTestEvent = async (
  ctx: ServiceContext,
  payload: SecurityTestEventPayload
): Promise<ServiceResult<SecurityTestEventRow>> => {
  try {
    requirePermission("manage_roles", ctx);
    const { data, error } = await ctx.supabase
      .from("security_test_events")
      .insert({
        company_id: ctx.companyId,
        category: payload.category,
        test_name: payload.test_name,
        result: payload.result,
        notes: payload.notes ?? null,
        executed_at: payload.executed_at ?? new Date().toISOString()
      })
      .select("id, company_id, category, test_name, result, notes, executed_at, created_at")
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: "Failed to create security test event" };
    }

    return { ok: true, data: data as SecurityTestEventRow };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Security audit insert failed" };
  }
};
