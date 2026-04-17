import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { reviewShiftSwapRequest } from "@emp/services/attendance.service";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/shift-swaps/review";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as {
      requestId?: string;
      decision?: string;
      note?: string;
    } | null;

    const decision = body?.decision === "approved" ? "approved" : body?.decision === "rejected" ? "rejected" : null;
    if (!decision) {
      return finalizeRoute(route, endpoint, jsonError("Decision must be approved or rejected", 400, route.requestId));
    }

    const result = await reviewShiftSwapRequest(route.ctx, {
      requestId: String(body?.requestId ?? ""),
      decision,
      note: typeof body?.note === "string" ? body.note : undefined
    });

    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to review shift change request"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to review shift change request", route.requestId));
  }
}
