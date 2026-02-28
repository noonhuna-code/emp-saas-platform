import type { ServiceContext } from "./types";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

export const enforceRateLimit = async (
  ctx: ServiceContext,
  endpoint: string,
  {
    windowSeconds = 60,
    limit = 100,
    requestId
  }: { windowSeconds?: number; limit?: number; requestId?: string } = {}
): Promise<RateLimitResult> => {
  if (!endpoint) {
    throw new Error("RATE_LIMIT_INVALID");
  }

  const { data, error } = await ctx.supabase.rpc("rate_limit_check", {
    p_endpoint: endpoint,
    p_window_seconds: windowSeconds,
    p_limit: limit,
    p_request_id: requestId ?? ctx.requestId
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? { allowed: true, remaining: limit, retry_after_seconds: windowSeconds }) as RateLimitResult;
};
