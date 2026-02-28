import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { getPayrollDeliveryMetrics } from "@emp/services/payroll.analytics.service";
import { parsePayrollAnalyticsMonths } from "../_shared";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/analytics/payroll/delivery";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const months = parsePayrollAnalyticsMonths(request);
    if (!months.ok) {
      return finalizeRoute(route, endpoint, jsonError(months.error, 400, route.requestId));
    }

    const result = await getPayrollDeliveryMetrics(route.ctx, route.ctx.companyId, { months: months.months });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load payroll delivery metrics"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load payroll delivery metrics", route.requestId));
  }
}
