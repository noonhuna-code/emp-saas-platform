import { NextResponse } from "next/server";
import { approveFinancialObligationRequest } from "@emp/services/financial-obligations.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

type ApproveRequestBody = {
  principalApproved?: number;
  termMonthsApproved?: number | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/finance/obligations/requests/[requestId]/approve";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { requestId } = await params;
    if (!requestId?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Request id is required", 400, route.requestId));
    }

    const body = (await request.json()) as ApproveRequestBody;
    if (!Number.isFinite(body.principalApproved)) {
      return finalizeRoute(route, endpoint, jsonError("Approved amount is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await approveFinancialObligationRequest(route.ctx!, requestId.trim(), {
        principalApproved: Number(body.principalApproved),
        termMonthsApproved: body.termMonthsApproved ?? null
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: {
            ok: false,
            error: sanitizeServiceError(result.error, "Financial obligation approval failed")
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to approve financial obligation request", route.requestId));
  }
}
