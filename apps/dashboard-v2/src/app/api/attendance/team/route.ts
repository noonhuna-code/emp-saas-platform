import { NextResponse } from "next/server";
import { listTeamAttendanceToday } from "@emp/services/attendance.service";
import { buildAttendanceRouteContext, sanitizeAttendanceServiceError, mapAttendanceServiceErrorStatus } from "../_utils";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/team";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "manage_employees", "manage_company"]);
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const departmentId = url.searchParams.get("departmentId") ?? undefined;

    const result = await listTeamAttendanceToday(ctx, { status: status ?? undefined, departmentId: departmentId ?? undefined });
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load team attendance", route.requestId));
  }
}
