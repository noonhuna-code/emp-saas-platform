import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";

export type AccessReviewLogInput = {
  reviewed_profile_id: string;
  role_snapshot?: Record<string, unknown> | null;
  decision: string;
};

const sanitizeError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  if (message === "UNAUTHENTICATED" || message.includes("JWT")) return "Authentication required";
  if (message.toLowerCase().includes("permission")) return "Permission denied";
  if (message === "INVALID_INPUT") return "Invalid input";
  return fallback;
};

export const createAccessReviewLog = async (
  ctx: ServiceContext,
  payload: AccessReviewLogInput
): Promise<ServiceResult<{ id: string }>> => {
  try {
    requirePermission("manage_roles", ctx);

    if (!payload.reviewed_profile_id || !payload.decision?.trim()) {
      return { ok: false, error: "Invalid input" };
    }

    const { data, error } = await ctx.supabase
      .from("access_review_logs")
      .insert({
        company_id: ctx.companyId,
        reviewer_profile_id: ctx.userProfileId,
        reviewed_profile_id: payload.reviewed_profile_id,
        role_snapshot: payload.role_snapshot ?? null,
        decision: payload.decision.trim(),
        created_at: new Date().toISOString()
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Access review logging failed") };
    }

    return { ok: true, data: { id: data.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Access review logging failed" };
  }
};