import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { listShiftChangeCandidates } from "@emp/services/attendance.service";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/shift-swaps/candidates";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const url = new URL(request.url);
    const attendanceDate = (url.searchParams.get("attendanceDate") ?? "").trim();
    const query = (url.searchParams.get("query") ?? "").trim() || undefined;
    const limitRaw = Number(url.searchParams.get("limit") ?? 60);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 60;

    const result = await listShiftChangeCandidates(route.ctx, { attendanceDate, query, limit });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to load shift change candidates"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load shift change candidates", route.requestId));
  }
}
