import { NextResponse } from "next/server";
import { cancelLeaveRequest } from "@emp/services/leave.service";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { buildLeaveRouteContext, resolveTargetEmployeeId } from "../_utils";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/leave/cancel";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildLeaveRouteContext(route.ctx);
    const body = (await request.json()) as { requestId?: string; employeeId?: string };
    const requestId = body.requestId?.trim() ?? "";

    if (!requestId) {
      return finalizeRoute(route, endpoint, jsonError("Leave request id is required", 400, route.requestId));
    }

    const employeeId = await resolveTargetEmployeeId(ctx, body.employeeId ?? null);
    if (!employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Employee record not found", 404, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await cancelLeaveRequest(ctx, requestId, employeeId);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Cancel request failed") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to cancel leave request", route.requestId));
  }
}
