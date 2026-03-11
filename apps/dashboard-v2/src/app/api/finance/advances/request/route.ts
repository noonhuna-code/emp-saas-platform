import { NextResponse } from "next/server";
import { submitFinancialObligationRequest } from "@emp/services/financial-obligations.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

type AdvanceRequestBody = {
  employeeId?: string;
  amount?: number;
  termMonths?: number | null;
  currencyCode?: string;
  reason?: string;
  termsSnapshot?: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/finance/advances/request";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as AdvanceRequestBody;
    if (!Number.isFinite(body.amount)) {
      return finalizeRoute(route, endpoint, jsonError("Amount is required", 400, route.requestId));
    }
    if (!body.currencyCode?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Currency code is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await submitFinancialObligationRequest(route.ctx!, "advance", {
        employeeId: body.employeeId,
        amount: Number(body.amount),
        termMonths: body.termMonths ?? null,
        currencyCode: body.currencyCode!,
        reason: body.reason,
        termsSnapshot: body.termsSnapshot ?? null
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: {
            ok: false,
            error: sanitizeServiceError(result.error, "Advance request submission failed")
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to submit advance request", route.requestId));
  }
}
