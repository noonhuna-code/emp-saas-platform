import { NextResponse } from "next/server";
import { getTeamLeaveCalendar } from "@emp/services/leave.service";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { buildLeaveRouteContext, jsonServiceError } from "../_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/leave/calendar";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildLeaveRouteContext(route.ctx);
    const url = new URL(request.url);
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    if (!dateFrom || !dateTo) {
      return finalizeRoute(route, endpoint, jsonError("dateFrom and dateTo are required", 400, route.requestId));
    }

    const result = await getTeamLeaveCalendar(ctx, dateFrom, dateTo);
    if (!result.ok) {
      return finalizeRoute(route, endpoint, jsonServiceError(result.error, "Leave calendar lookup failed", route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load team leave calendar", route.requestId));
  }
}
