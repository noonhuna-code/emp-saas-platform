import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
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

    const cacheKey = `${ctx.companyId}:${ctx.userId}:${endpoint}:${dateFrom}:${dateTo}`;
    const cached = getCached<any>(cacheKey, 45000);
    if (cached) {
      return finalizeRoute(
        route,
        endpoint,
        NextResponse.json({ ok: true, data: cached }, {
          status: 200,
          headers: {
            "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
          }
        })
      );
    }

    const result = await getTeamLeaveCalendar(ctx, dateFrom, dateTo);
    if (!result.ok) {
      return finalizeRoute(route, endpoint, jsonServiceError(result.error, "Leave calendar lookup failed", route.requestId));
    }

    setCached(cacheKey, result.data);

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: result.data }, {
        status: 200,
        headers: {
          "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
        }
      })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load team leave calendar", route.requestId));
  }
}

