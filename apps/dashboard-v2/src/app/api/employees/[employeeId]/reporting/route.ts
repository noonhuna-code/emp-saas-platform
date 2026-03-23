import { NextResponse } from "next/server";
import { getEmployeeReportingSummary } from "@emp/services/employee.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/reporting";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId } = await params;
    const result = await getEmployeeReportingSummary(route.ctx, employeeId);
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load employee reporting summary"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(
      route,
      endpoint,
      handleRouteError(error, "Unable to load employee reporting summary", route.requestId)
    );
  }
}
