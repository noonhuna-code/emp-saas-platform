import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { runBillingOverdueScheduler } from "@emp/services/billing.service";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/billing/scheduler/overdue";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await runBillingOverdueScheduler(route.ctx!);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to run billing scheduler") }
        };
      }
      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to run billing scheduler", route.requestId));
  }
}
