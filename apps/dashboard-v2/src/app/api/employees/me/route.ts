import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { resolveCurrentEmployeeId } from "@/lib/server/employee-context";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/employees/me";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const cacheKey = `${route.ctx.companyId}:${route.ctx.userId}:${endpoint}`;
    const cached = getCached<{ employeeId: string }>(cacheKey, 45000);
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

    const employeeId = await resolveCurrentEmployeeId(route.ctx);
    if (!employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Employee record not found", 404, route.requestId));
    }

    const payload = { employeeId };
    setCached(cacheKey, payload);

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: payload }, {
        status: 200,
        headers: {
          "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
        }
      })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to resolve employee", route.requestId));
  }
}

