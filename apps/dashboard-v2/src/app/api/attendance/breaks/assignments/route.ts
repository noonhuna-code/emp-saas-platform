import { NextResponse } from "next/server";
import { listBreakAssignments } from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError } from "@/lib/server/api-errors";
import { buildAttendanceRouteContext, isUnauthenticatedError, jsonError, mapAttendanceServiceErrorStatus, sanitizeAttendanceServiceError } from "@/app/api/attendance/_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/breaks/assignments";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "manage_employees", "assign_shifts", "manage_shifts", "view_attendance"]);
    const url = new URL(request.url);
    const employeeId = (url.searchParams.get("employeeId") ?? "").trim() || undefined;
    const limitRaw = Number(url.searchParams.get("limit") ?? 40);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 40;

    const result = await listBreakAssignments(ctx, { employeeId, limit });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeAttendanceServiceError(result.error), mapAttendanceServiceErrorStatus(result.error), route.requestId)
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, { status: 200 }));
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load break assignments", route.requestId));
  }
}
