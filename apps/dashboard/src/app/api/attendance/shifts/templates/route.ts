import { NextResponse } from "next/server";
import { listShiftTemplates } from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError } from "@/lib/server/api-errors";
import { buildAttendanceRouteContext, isUnauthenticatedError, jsonError, mapAttendanceServiceErrorStatus, sanitizeAttendanceServiceError } from "@/app/api/attendance/_utils";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/attendance/shifts/templates";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "manage_employees"]);
    const result = await listShiftTemplates(ctx);

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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load shift templates", route.requestId));
  }
}
