import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { listWorkspaceResources } from "@emp/services/employee-workspace.service";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/resources";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;

    const cacheKey = `${route.ctx.companyId}:${route.ctx.userId}:${endpoint}:${limit}`;
    const cached = getCached<any>(cacheKey, 45000);
    if (cached) {
      return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: cached, requestId: route.requestId }, { status: 200, headers: { "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30" } }));
    }


    const result = await listWorkspaceResources(route.ctx, limit);
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to load resources"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    setCached(cacheKey, result.data);

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, { status: 200, headers: { "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30" } }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load resources", route.requestId));
  }
}

