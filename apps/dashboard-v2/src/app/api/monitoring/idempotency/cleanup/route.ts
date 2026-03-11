import { NextResponse } from "next/server";
import { cleanupExpiredIdempotency } from "@emp/services/monitoring.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/monitoring/idempotency/cleanup";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;
    const payload = (await request.json()) as { endpoint?: string };

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await cleanupExpiredIdempotency(ctx, payload.endpoint);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Cleanup failed") }
        };
      }
      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json(guarded.response.body, { status: guarded.response.status })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Cleanup failed", route.requestId));
  }
}
