import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { getAdminDashboard } from "@emp/services/dashboard.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/dashboard/admin";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }


    const cacheKey = `${route.ctx.companyId}:${route.ctx.userId}:${endpoint}`;
    const cached = getCached<any>(cacheKey, 15000);
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
    const result = await getAdminDashboard(route.ctx);
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load admin dashboard"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    setCached(cacheKey, result.data);

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, {
      status: 200,
      headers: {
        "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
      }
    }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load admin dashboard", route.requestId));
  }
}
