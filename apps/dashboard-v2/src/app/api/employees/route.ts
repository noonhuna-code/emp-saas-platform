import { NextResponse } from "next/server";
import { listEmployees } from "@emp/services/employee.service";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/employees";

  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
    const departmentId = url.searchParams.get("department_id") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;
    const result = await listEmployees(ctx, { page, pageSize, departmentId, status });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load employees"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json(result, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load employees", route.requestId));
  }
}
