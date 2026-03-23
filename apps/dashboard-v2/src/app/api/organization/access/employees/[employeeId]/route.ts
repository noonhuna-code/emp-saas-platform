import { NextResponse } from "next/server";
import { explainEmployeeReadAccess } from "@emp/services/access-scope.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/organization/access/employees/[employeeId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId } = await params;
    const explanation = await explainEmployeeReadAccess(route.ctx, employeeId);

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: explanation }, { status: 200 })
    );
  } catch (error) {
    return finalizeRoute(
      route,
      endpoint,
      handleRouteError(error, "Unable to explain employee access scope", route.requestId)
    );
  }
}
