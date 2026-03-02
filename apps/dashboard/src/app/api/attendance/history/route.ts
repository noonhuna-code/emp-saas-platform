import { NextResponse } from "next/server";
import { getAttendanceHistory } from "@emp/services/attendance.service";
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
  const endpoint = "/api/attendance/history";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "view_attendance"]);
    const url = new URL(request.url);
    const page = parsePositiveInt(url.searchParams.get("page"), 1, { min: 1, max: 1000 });
    const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 20, { min: 1, max: 100 });
    const dateFrom = url.searchParams.get("dateFrom") ?? "";
    const dateTo = url.searchParams.get("dateTo") ?? "";
    const statusFilter = (url.searchParams.get("status") ?? "").trim().toLowerCase();

    const result = await getAttendanceHistory(ctx, {
      page,
      pageSize,
      dateFrom,
      dateTo,
      status: statusFilter
    });

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

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    if (error instanceof Error && error.message.startsWith("Missing permission:")) {
      return finalizeRoute(route, endpoint, jsonError("Permission denied", 403, route.requestId));
    }
    return finalizeRoute(route, endpoint, jsonError("Unable to load attendance history", 500, route.requestId));
  }
}
