import { NextResponse } from "next/server";
import { listPendingAttendanceCorrections } from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import {
  buildAttendanceRouteContext,
  isUnauthenticatedError,
  jsonError,
  parsePositiveInt,
  sanitizeAttendanceServiceError,
  mapAttendanceServiceErrorStatus
} from "../_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/review";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx);
    const url = new URL(request.url);

    const employeeId = (url.searchParams.get("employeeId") ?? "").trim() || undefined;
    const dateFrom = (url.searchParams.get("dateFrom") ?? "").trim() || undefined;
    const dateTo = (url.searchParams.get("dateTo") ?? "").trim() || undefined;
    const limit = parsePositiveInt(url.searchParams.get("limit"), 100, { min: 1, max: 200 });

    const result = await listPendingAttendanceCorrections(ctx, {
      employeeId,
      dateFrom,
      dateTo,
      limit
    });

    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        NextResponse.json(
          { ok: false, error: sanitizeAttendanceServiceError(result.error) },
          { status: mapAttendanceServiceErrorStatus(result.error) }
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json(result, { status: 200 }));
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    if (error instanceof Error && error.message.startsWith("Missing permission:")) {
      return finalizeRoute(route, endpoint, jsonError("Permission denied", 403, route.requestId));
    }
    return finalizeRoute(route, endpoint, jsonError("Unable to load review queue", 500, route.requestId));
  }
}
