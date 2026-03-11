import { NextResponse } from "next/server";
import { requestOvertime, type OvertimeRequestInput } from "@emp/services/overtime.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { resolveCurrentEmployeeId } from "@/lib/server/employee-context";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/overtime/request";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;

    const payload = (await request.json()) as {
      employeeId?: string;
      attendanceId?: string | null;
      requestDate?: string;
      requestedMinutes?: number;
      request_date?: string;
      requested_minutes?: number;
    } & OvertimeRequestInput;

    const employeeId = payload.employeeId ?? (await resolveCurrentEmployeeId(ctx));
    if (!employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Employee record not found", 404, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await requestOvertime(ctx, employeeId, {
        attendance_id: payload.attendanceId ?? null,
        request_date: payload.requestDate ?? payload.request_date ?? "",
        requested_minutes: payload.requestedMinutes ?? payload.requested_minutes ?? 0,
        reason: payload.reason
      });

      if (!result.ok || !result.data) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Overtime request failed") }
        };
      }

      return { status: 200, body: { ok: true, data: { request: result.data } } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to request overtime", route.requestId));
  }
}
