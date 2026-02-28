import { NextResponse } from "next/server";
import { rejectObligationRequest } from "@emp/services/financial-obligations.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

type RejectRequestBody = {
  reason?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/finance/obligations/[id]/reject";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { id } = await params;
    if (!id?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Request id is required", 400, route.requestId));
    }

    const body = (await request.json()) as RejectRequestBody;

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await rejectObligationRequest(route.ctx!, id.trim(), body.reason);

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: {
            ok: false,
            error: sanitizeServiceError(result.error, "Financial obligation rejection failed")
          }
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to reject financial obligation request", route.requestId));
  }
}
