import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { resolveCurrentEmployeeId } from "@/lib/server/employee-context";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/employees/me";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const employeeId = await resolveCurrentEmployeeId(route.ctx);
    if (!employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Employee record not found", 404, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { employeeId } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to resolve employee", route.requestId));
  }
}
