import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { getWorkspaceCalendar } from "@emp/services/employee-workspace.service";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/calendar";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const url = new URL(request.url);
    const month = (url.searchParams.get("month") ?? "").trim() || undefined;

    const cacheKey = `${route.ctx.companyId}:${route.ctx.userId}:${endpoint}:${month ?? ""}`;
    const cached = getCached<any>(cacheKey, 15000);
    if (cached) {
      return finalizeRoute(
        route,
        endpoint,
        NextResponse.json({ ok: true, data: cached, requestId: route.requestId }, {
          status: 200,
          headers: {
            "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
          }
        })
      );
    }

    const result = await getWorkspaceCalendar(route.ctx, month);
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to load workspace calendar"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    setCached(cacheKey, result.data);

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, {
        status: 200,
        headers: {
          "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
        }
      })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load workspace calendar", route.requestId));
  }
}
