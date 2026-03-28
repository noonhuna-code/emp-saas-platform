import type { ServiceContext } from "@emp/lib/types";
import { withIdempotency, type IdempotentResponse, type IdempotencyResult } from "@emp/lib/idempotency";
import { enforceRateLimit } from "@emp/lib/rate-limit";

const getIdempotencyKey = (request: Request): string | null => {
  const key = request.headers.get("idempotency-key") ?? request.headers.get("Idempotency-Key");
  const trimmed = key?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export type GuardedMutationResult =
  | { ok: true; response: IdempotentResponse<unknown>; idempotent: boolean }
  | { ok: false; error: string; status: number };

export const runGuardedMutation = async (
  ctx: ServiceContext,
  request: Request,
  endpoint: string,
  handler: () => Promise<IdempotentResponse<unknown>>,
  rateLimit?: { windowSeconds?: number; limit?: number }
): Promise<GuardedMutationResult> => {
  const key = getIdempotencyKey(request);
  if (!key) {
    return { ok: false, error: "Idempotency key required", status: 400 };
  }

  try {
    if (!endpoint.startsWith("/api/billing") && !endpoint.startsWith("/api/auth/")) {
      const { data: blocked, error: blockedError } = await ctx.supabase.rpc("company_billing_is_write_blocked", {
        p_company_id: ctx.companyId,
        p_endpoint: endpoint
      });
      if (blockedError) {
        return { ok: false, error: "Billing enforcement failed", status: 400 };
      }
      if (Boolean(blocked)) {
        return { ok: false, error: "Billing past due: write operations are blocked", status: 402 };
      }
    }

    await enforceRateLimit(ctx, endpoint, { ...rateLimit, requestId: ctx.requestId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RATE_LIMIT_EXCEEDED";
    if (message === "RATE_LIMIT_EXCEEDED") {
      return { ok: false, error: "Rate limit exceeded", status: 429 };
    }
    return { ok: false, error: "Rate limit enforcement failed", status: 400 };
  }

  const idempotentResult: IdempotencyResult<unknown> = await withIdempotency(ctx, key, endpoint, handler);
  if (!idempotentResult.ok) {
    const status = idempotentResult.error === "Idempotency key already in progress" ? 409 : 400;
    return { ok: false, error: idempotentResult.error, status };
  }

  return {
    ok: true,
    response: idempotentResult.data,
    idempotent: idempotentResult.idempotent
  };
};
