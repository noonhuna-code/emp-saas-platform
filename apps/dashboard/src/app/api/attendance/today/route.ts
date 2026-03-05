import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { getAttendanceToday } from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import {
  buildAttendanceRouteContext,
  isUnauthenticatedError,
  jsonError,
  mapAttendanceServiceErrorStatus,
  sanitizeAttendanceServiceError
} from "../_utils";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/attendance/today";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "view_attendance"]);

    const cacheKey = `${ctx.companyId}:${ctx.userId}:${endpoint}`;
    const cached = getCached<any>(cacheKey, 45000);
    if (cached) {
      return finalizeRoute(
        route,
        endpoint,
        NextResponse.json(
          { ok: true, data: cached },
          {
            status: 200,
            headers: {
              "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
            }
          }
        )
      );
    }

    const result = await getAttendanceToday(ctx);
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        NextResponse.json(
          { ok: false, error: sanitizeAttendanceServiceError(result.error) },
          { status: mapAttendanceServiceErrorStatus(result.error) }
        )
      );
    }

    setCached(cacheKey, result.data);

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200, headers: { "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30" } }));
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    if (error instanceof Error && error.message.startsWith("Missing permission:")) {
      return finalizeRoute(route, endpoint, jsonError("Permission denied", 403, route.requestId));
    }
    return finalizeRoute(route, endpoint, jsonError("Unable to load attendance status", 500, route.requestId));
  }
}

