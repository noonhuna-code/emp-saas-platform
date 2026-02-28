import type { ServiceContext } from "@emp/lib/types";

export type RequestTracePayload = {
  endpoint: string;
  statusCode: number;
  durationMs: number;
};

export const logRequestTrace = async (ctx: ServiceContext, payload: RequestTracePayload): Promise<void> => {
  try {
    await ctx.supabase.from("request_traces_partitioned").insert({
      company_id: ctx.companyId,
      request_id: ctx.requestId,
      endpoint: payload.endpoint,
      actor_profile_id: ctx.userProfileId,
      duration_ms: payload.durationMs,
      status_code: payload.statusCode,
      created_at: new Date().toISOString()
    });
  } catch {
    // Swallow logging failures to avoid breaking primary flows.
  }
};

export const attachRequestId = (response: Response, requestId: string): Response => {
  response.headers.set("x-request-id", requestId);
  return response;
};
