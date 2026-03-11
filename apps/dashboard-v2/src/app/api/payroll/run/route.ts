import { NextResponse } from "next/server";
import { runPayroll } from "@emp/services/payroll.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/payroll/run";

  try {
    const ctx = route.ctx;
    if (!ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as { year?: number; month?: number };
    const year = Number(body.year);
    const month = Number(body.month);

    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return finalizeRoute(route, endpoint, jsonError("Valid year and month are required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await runPayroll(ctx, ctx.companyId, { year, month });
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Payroll run failed") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to run payroll", route.requestId));
  }
}
