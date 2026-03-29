import { NextResponse } from "next/server";
import { assignGoApplied } from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import {
  buildAttendanceRouteContext,
  isUnauthenticatedError,
  jsonError,
  mapAttendanceServiceErrorStatus,
  sanitizeAttendanceServiceError
} from "../_utils";

type GoAssignBody = {
  employeeId?: string;
  attendanceDate?: string;
  note?: string | null;
};

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/go-assign";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "manage_employees", "manage_company"]);
    const body = (await request.json()) as GoAssignBody;

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await assignGoApplied(ctx, {
        employeeId: String(body.employeeId ?? ""),
        attendanceDate: String(body.attendanceDate ?? ""),
        note: typeof body.note === "string" ? body.note : null
      });

      if (!result.ok) {
        return {
          status: mapAttendanceServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeAttendanceServiceError(result.error) }
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    if (isUnauthenticatedError(error)) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to assign GO", route.requestId));
  }
}
