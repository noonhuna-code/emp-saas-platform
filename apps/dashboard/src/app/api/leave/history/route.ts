import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { listLeaveRequests } from "@emp/services/leave.service";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { buildLeaveRouteContext, jsonServiceError, resolveTargetEmployeeId } from "../_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/leave/history";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildLeaveRouteContext(route.ctx);
    const url = new URL(request.url);
    const employeeParam = url.searchParams.get("employeeId");
    const statusParam = url.searchParams.get("status");
    const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
    const dateTo = url.searchParams.get("dateTo") ?? undefined;
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");

    const employeeId = await resolveTargetEmployeeId(ctx, employeeParam);
    if (!employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Employee record not found", 404, route.requestId));
    }

    const status = statusParam ? statusParam.split(",").filter(Boolean) : undefined;
    const offset = Number.isFinite(page) && Number.isFinite(pageSize) ? (Math.max(1, page) - 1) * pageSize : 0;

    const result = await listLeaveRequests(ctx, employeeId, {
      status,
      dateFrom,
      dateTo,
      limit: Number.isFinite(pageSize) ? pageSize : undefined,
      offset
    });

    if (!result.ok) {
      return finalizeRoute(route, endpoint, jsonServiceError(result.error, "Leave history lookup failed", route.requestId));
    }

    setCached(cacheKey, result.data);

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200, headers: { "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30" } }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load leave history", route.requestId));
  }
}
