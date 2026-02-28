import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { requestBillingSubscriptionCancellation } from "@emp/services/billing.service";

type CancelBody = {
  reason?: string;
};

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/billing/subscription/cancel";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as CancelBody;
    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await requestBillingSubscriptionCancellation(route.ctx!, {
        reason: body.reason
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to request cancellation") }
        };
      }

      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to request cancellation", route.requestId));
  }
}
