import { NextResponse } from "next/server";
import { requestAttendanceCorrection } from "@emp/services/attendance.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import type { AttendanceCorrectionRequestInput } from "@/lib/types/attendance";
import {
  buildAttendanceRouteContext,
  isUnauthenticatedError,
  jsonError,
  mapAttendanceServiceErrorStatus,
  sanitizeAttendanceServiceError
} from "../_utils";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/correction-request";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildAttendanceRouteContext(route.ctx, ["manage_attendance", "view_attendance"]);
    const body = (await request.json()) as Partial<AttendanceCorrectionRequestInput>;

    const attendanceId = typeof body.attendanceId === "string" ? body.attendanceId.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason : "";
    const requestedCheckIn =
      typeof body.requestedCheckIn === "string" && body.requestedCheckIn.trim()
        ? body.requestedCheckIn
        : null;
    const requestedCheckOut =
      typeof body.requestedCheckOut === "string" && body.requestedCheckOut.trim()
        ? body.requestedCheckOut
        : null;
    const note = typeof body.note === "string" ? body.note : null;

    if (!attendanceId) {
      return finalizeRoute(route, endpoint, jsonError("Attendance record is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await requestAttendanceCorrection(ctx, attendanceId, {
        requested_clock_in: requestedCheckIn,
        requested_clock_out: requestedCheckOut,
        reason,
        note
      });

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
    return finalizeRoute(route, endpoint, jsonError("Attendance correction request failed", 500, route.requestId));
  }
}
