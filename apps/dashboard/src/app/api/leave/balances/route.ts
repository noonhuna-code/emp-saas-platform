import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { listLeaveBalances } from "@emp/services/leave.service";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { buildLeaveRouteContext, jsonServiceError, resolveTargetEmployeeId } from "../_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/leave/balances";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildLeaveRouteContext(route.ctx);
    const url = new URL(request.url);
    const employeeParam = url.searchParams.get("employeeId");
    const yearParam = url.searchParams.get("year");

    const employeeId = await resolveTargetEmployeeId(ctx, employeeParam);
    if (!employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Employee record not found", 404, route.requestId));
    }

    const year = yearParam ? Number(yearParam) : undefined;
    const resolvedYear = Number.isFinite(year) ? year : undefined;

    const cacheKey = `${ctx.companyId}:${ctx.userId}:${endpoint}:${employeeId}:${resolvedYear ?? ""}`;
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

    const result = await listLeaveBalances(ctx, employeeId, resolvedYear);
    if (!result.ok) {
      return finalizeRoute(route, endpoint, jsonServiceError(result.error, "Leave balances lookup failed", route.requestId));
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load leave balances", route.requestId));
  }
}

