import { NextResponse } from "next/server";
import { getOrganizationOverview } from "@emp/services/org-chart.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/organization/overview";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const result = await getOrganizationOverview(route.ctx);
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load organization overview"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load organization overview", route.requestId));
  }
}
