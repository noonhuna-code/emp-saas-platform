import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { getMonitoringSlaOverview } from "@emp/services/monitoring.service";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/monitoring/sla";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const result = await getMonitoringSlaOverview(route.ctx);
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load SLA overview"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load SLA overview", route.requestId));
  }
}
