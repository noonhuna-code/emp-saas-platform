import { NextResponse } from "next/server";
import { listMyFinancialObligationRequests } from "@emp/services/financial-obligations.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { parseNonNegativeInt, parsePositiveInt, parseStatusList } from "@/app/api/finance/_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/finance/obligations/requests/mine";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const url = new URL(request.url);
    const result = await listMyFinancialObligationRequests(route.ctx, {
      status: parseStatusList(url.searchParams),
      limit: parsePositiveInt(url.searchParams.get("limit")),
      offset: parseNonNegativeInt(url.searchParams.get("offset"))
    });

    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to load financial obligation requests"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load financial obligation requests", route.requestId));
  }
}

