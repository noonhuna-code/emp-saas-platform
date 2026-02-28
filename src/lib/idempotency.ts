import type { ServiceContext } from "./types";

export type IdempotentResponse<T> = {
  status: number;
  body: T;
};

export type IdempotencyResult<T> =
  | { ok: true; data: IdempotentResponse<T>; idempotent: boolean }
  | { ok: false; error: string };

export type IdempotencyCleanupResult =
  | { ok: true; expired: number }
  | { ok: false; error: string };

type IdempotencyBeginResponse = {
  status?: string;
  response?: IdempotentResponse<unknown> | null;
  is_new?: boolean;
};

export const withIdempotency = async <T>(
  ctx: ServiceContext,
  key: string,
  endpoint: string,
  handler: () => Promise<IdempotentResponse<T>>,
  ttlHours = 24
): Promise<IdempotencyResult<T>> => {
  if (!key) {
    return { ok: false, error: "Idempotency key required" };
  }
  if (!endpoint) {
    return { ok: false, error: "Idempotency endpoint required" };
  }

  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const { data: beginData, error: beginError } = await ctx.supabase.rpc("idempotency_begin", {
    p_key: key,
    p_endpoint: endpoint,
    p_expires_at: expiresAt
  });

  if (beginError) {
    return { ok: false, error: beginError.message };
  }

  const parsed = (beginData ?? {}) as IdempotencyBeginResponse;
  const status = parsed.status ?? "processing";
  const isNew = Boolean(parsed.is_new);

  if (status === "completed" && parsed.response) {
    return { ok: true, data: parsed.response as IdempotentResponse<T>, idempotent: true };
  }

  if (status === "processing" && !isNew) {
    return { ok: false, error: "Idempotency key already in progress" };
  }

  let payload: IdempotentResponse<T>;
  try {
    payload = await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Idempotency handler failed";
    payload = {
      status: 500,
      body: { ok: false, error: message } as T
    };
  }

  const { error: completeError } = await ctx.supabase.rpc("idempotency_complete", {
    p_key: key,
    p_endpoint: endpoint,
    p_response: payload
  });

  if (completeError) {
    return { ok: false, error: completeError.message };
  }

  return { ok: true, data: payload, idempotent: false };
};

export const markExpiredIdempotency = async (
  ctx: ServiceContext,
  endpoint?: string
): Promise<IdempotencyCleanupResult> => {
  const nowIso = new Date().toISOString();
  let query = ctx.supabase
    .from("api_idempotency_keys")
    .update({ status: "expired", response: null })
    .lt("expires_at", nowIso)
    .eq("company_id", ctx.companyId)
    .neq("status", "expired")
    .select("id");

  if (endpoint) {
    query = query.eq("endpoint", endpoint);
  }

  const { data, error } = await query;
  if (error) {
    return { ok: false, error: "Failed to mark expired idempotency keys" };
  }

  return { ok: true, expired: data?.length ?? 0 };
};
