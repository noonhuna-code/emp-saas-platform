import { NextResponse } from "next/server";
import { getBillingOverview } from "@emp/services/billing.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/billing/entitlements";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const result = await getBillingOverview(route.ctx);
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load entitlements"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json(
        {
          ok: true,
          data: {
            entitlements: result.data.entitlements,
            resolvedAt: result.data.resolvedAt,
            seatSummary: result.data.seatSummary
          }
        },
        { status: 200 }
      )
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load entitlements", route.requestId));
  }
}
