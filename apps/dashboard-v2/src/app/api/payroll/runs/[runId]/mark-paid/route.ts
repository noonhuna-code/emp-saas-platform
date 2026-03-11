import { NextResponse } from "next/server";
import { markPayrollRunPaid } from "@emp/services/payroll.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/payroll/runs/[runId]/mark-paid";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { runId } = await params;
    if (!runId?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Payroll run id is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await markPayrollRunPaid(route.ctx!, route.ctx!.companyId, runId.trim());
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to mark payroll run as paid") }
        };
      }

      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to mark payroll run as paid", route.requestId));
  }
}

