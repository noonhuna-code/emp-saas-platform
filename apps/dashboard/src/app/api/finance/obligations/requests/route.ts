import { NextResponse } from "next/server";
import { listObligationRequests } from "@emp/services/financial-obligations.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import {
  parseIsoDate,
  parseNonNegativeInt,
  parseObligationType,
  parsePositiveInt,
  parseStatusList
} from "@/app/api/finance/_utils";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/finance/obligations/requests";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const url = new URL(request.url);
    const result = await listObligationRequests(route.ctx, {
      employeeId: url.searchParams.get("employeeId")?.trim() || undefined,
      obligationType: parseObligationType(url.searchParams.get("obligationType")),
      status: parseStatusList(url.searchParams),
      dateFrom: parseIsoDate(url.searchParams.get("dateFrom")),
      dateTo: parseIsoDate(url.searchParams.get("dateTo")),
      limit: parsePositiveInt(url.searchParams.get("limit")),
      offset: parseNonNegativeInt(url.searchParams.get("offset"))
    });

    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load financial obligation requests"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load financial obligation requests", route.requestId));
  }
}

