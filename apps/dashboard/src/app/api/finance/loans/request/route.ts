import { NextResponse } from "next/server";
import { submitFinancialObligationRequest } from "@emp/services/financial-obligations.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

type LoanRequestBody = {
  employeeId?: string;
  amount?: number;
  termMonths?: number | null;
  currencyCode?: string;
  reason?: string;
  termsSnapshot?: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/finance/loans/request";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as LoanRequestBody;
    if (!Number.isFinite(body.amount)) {
      return finalizeRoute(route, endpoint, jsonError("Amount is required", 400, route.requestId));
    }
    if (!body.currencyCode?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Currency code is required", 400, route.requestId));
    }
    if (!Number.isFinite(body.termMonths) || Number(body.termMonths) <= 0) {
      return finalizeRoute(route, endpoint, jsonError("Loan term is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await submitFinancialObligationRequest(route.ctx!, "loan", {
        employeeId: body.employeeId,
        amount: Number(body.amount),
        termMonths: Number(body.termMonths),
        currencyCode: body.currencyCode!,
        reason: body.reason,
        termsSnapshot: body.termsSnapshot ?? null
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: {
            ok: false,
            error: sanitizeServiceError(result.error, "Loan request submission failed")
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to submit loan request", route.requestId));
  }
}
