import { NextResponse } from "next/server";
import { getPayslipDetail } from "@emp/services/payroll.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/payslips/[entryId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { entryId } = await params;
    const result = await getPayslipDetail(route.ctx, entryId);
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load payslip"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load payslip", route.requestId));
  }
}
