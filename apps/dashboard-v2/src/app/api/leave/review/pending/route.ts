import { NextResponse } from "next/server";
import { listPendingLeaveRequests } from "@emp/services/leave.service";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { buildLeaveRouteContext, jsonServiceError } from "../../_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/leave/review/pending";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildLeaveRouteContext(route.ctx);
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId") ?? undefined;
    const statusParam = url.searchParams.get("status");
    const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
    const dateTo = url.searchParams.get("dateTo") ?? undefined;
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

    const status = statusParam ? statusParam.split(",").filter(Boolean) : undefined;
    const offset = Number.isFinite(page) && Number.isFinite(pageSize) ? (Math.max(1, page) - 1) * pageSize : 0;

    const result = await listPendingLeaveRequests(ctx, {
      employeeId,
      status,
      dateFrom,
      dateTo,
      limit: Number.isFinite(pageSize) ? pageSize : undefined,
      offset
    });

    if (!result.ok) {
      return finalizeRoute(route, endpoint, jsonServiceError(result.error, "Pending leave lookup failed", route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load leave approvals", route.requestId));
  }
}
