import { NextResponse } from "next/server";
import { getPayrollRunDeliveryStatus } from "@emp/services/payroll.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/payroll/runs/[runId]/delivery-status";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { runId } = await params;
    if (!runId?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Payroll run id is required", 400, route.requestId));
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "25");

    const result = await getPayrollRunDeliveryStatus(route.ctx, route.ctx.companyId, runId.trim(), {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 25
    });

    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load payroll delivery status"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load payroll delivery status", route.requestId));
  }
}

