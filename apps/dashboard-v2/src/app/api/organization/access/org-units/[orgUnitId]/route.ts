import { NextResponse } from "next/server";
import { explainOrgUnitReadAccess } from "@emp/services/access-scope.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgUnitId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/organization/access/org-units/[orgUnitId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { orgUnitId } = await params;
    const explanation = await explainOrgUnitReadAccess(route.ctx, orgUnitId);

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: explanation }, { status: 200 })
    );
  } catch (error) {
    return finalizeRoute(
      route,
      endpoint,
      handleRouteError(error, "Unable to explain org unit access scope", route.requestId)
    );
  }
}
