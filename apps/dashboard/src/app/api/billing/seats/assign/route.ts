import { NextResponse } from "next/server";
import { assignCompanySeat } from "@emp/services/billing.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

type AssignSeatBody = {
  userProfileId?: string;
  isBillable?: boolean;
};

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/billing/seats/assign";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as AssignSeatBody;
    const userProfileId = body.userProfileId?.trim() ?? "";

    if (!userProfileId) {
      return finalizeRoute(route, endpoint, jsonError("User profile id is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await assignCompanySeat(route.ctx!, {
        userProfileId,
        isBillable: body.isBillable ?? true
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to assign seat") }
        };
      }

      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to assign seat", route.requestId));
  }
}
