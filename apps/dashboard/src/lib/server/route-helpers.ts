import type { ServiceContext } from "@emp/lib/types";
import { buildServiceContext } from "./service-context";
import { getRequestId } from "./request-id";
import { logRequestTrace, attachRequestId } from "./request-trace";

export type RouteContext = {
  ctx: ServiceContext | null;
  requestId: string;
  startedAt: number;
};

export const beginRoute = async (): Promise<RouteContext> => {
  const requestId = getRequestId();
  const startedAt = Date.now();
  try {
    const ctx = await buildServiceContext(requestId);
    return { ctx, requestId, startedAt };
  } catch {
    return { ctx: null, requestId, startedAt };
  }
};

export const finalizeRoute = async (
  route: RouteContext,
  endpoint: string,
  response: Response
): Promise<Response> => {
  const withHeader = attachRequestId(response, route.requestId);
  if (route.ctx) {
    await logRequestTrace(route.ctx, {
      endpoint,
      statusCode: (response as Response).status,
      durationMs: Date.now() - route.startedAt
    });
  }
  return withHeader;
};
