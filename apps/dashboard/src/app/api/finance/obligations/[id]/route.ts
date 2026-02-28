import { NextResponse } from "next/server";
import { getObligationDetail } from "@emp/services/financial-obligations.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { parseNonNegativeInt, parsePositiveInt } from "@/app/api/finance/_utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/finance/obligations/[id]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { id } = await params;
    if (!id?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Obligation id is required", 400, route.requestId));
    }

    const url = new URL(request.url);
    const result = await getObligationDetail(route.ctx, id.trim(), {
      ledgerLimit: parsePositiveInt(url.searchParams.get("ledgerLimit")),
      ledgerOffset: parseNonNegativeInt(url.searchParams.get("ledgerOffset"))
    });

    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load financial obligation"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load financial obligation", route.requestId));
  }
}

