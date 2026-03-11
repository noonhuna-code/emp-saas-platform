import { NextResponse } from "next/server";
import { getEmployeeProfile, upsertEmployeePersonalDetails, type PersonalDetailsInput } from "@emp/services/employee.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/personal";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const payload = (await request.json()) as PersonalDetailsInput;
    const { employeeId } = await params;

    const updateResult = await upsertEmployeePersonalDetails(route.ctx, employeeId, payload);
    if (!updateResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(updateResult.error, "Unable to update personal details"),
          mapServiceErrorStatus(updateResult.error),
          route.requestId
        )
      );
    }

    const profileResult = await getEmployeeProfile(route.ctx, employeeId);
    if (!profileResult.ok || !profileResult.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(profileResult.error, "Unable to load updated profile"),
          mapServiceErrorStatus(profileResult.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { profile: profileResult.data } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update personal details", route.requestId));
  }
}
