import { NextResponse } from "next/server";
import { approveAttendanceCorrection } from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import {
  buildAttendanceRouteContext,
  isUnauthenticatedError,
  jsonError,
  mapAttendanceServiceErrorStatus,
  sanitizeAttendanceServiceError
} from "../_utils";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/approve";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx);
    const body = (await request.json()) as { correctionId?: string };
    const correctionId = typeof body.correctionId === "string" ? body.correctionId.trim() : "";

    if (!correctionId) {
      return finalizeRoute(route, endpoint, jsonError("Correction id is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await approveAttendanceCorrection(ctx, correctionId);
      if (!result.ok) {
        return {
          status: mapAttendanceServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeAttendanceServiceError(result.error) }
        };
      }

      return { status: 200, body: result };
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
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    if (error instanceof Error && error.message.startsWith("Missing permission:")) {
      return finalizeRoute(route, endpoint, jsonError("Permission denied", 403, route.requestId));
    }
    return finalizeRoute(route, endpoint, jsonError("Attendance correction approval failed", 500, route.requestId));
  }
}
