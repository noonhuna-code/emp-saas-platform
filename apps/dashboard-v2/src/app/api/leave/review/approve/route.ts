import { NextResponse } from "next/server";
import { approveLeave } from "@emp/services/leave.service";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { buildLeaveRouteContext } from "../../_utils";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/leave/review/approve";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildLeaveRouteContext(route.ctx);
    const body = (await request.json()) as { requestId?: string };

    if (!body.requestId) {
      return finalizeRoute(route, endpoint, jsonError("Leave request id is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await approveLeave(ctx, body.requestId as string);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Leave approval failed") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to approve leave request", route.requestId));
  }
}
