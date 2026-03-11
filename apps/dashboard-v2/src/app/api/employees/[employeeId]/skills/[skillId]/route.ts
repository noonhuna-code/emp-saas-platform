import { NextResponse } from "next/server";
import { deleteEmployeeSkill, getEmployeeProfile, updateEmployeeSkill, type EmployeeSkillInput } from "@emp/services/employee.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; skillId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/skills/[skillId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const payload = (await request.json()) as EmployeeSkillInput;
    const { employeeId, skillId } = await params;
    const updateResult = await updateEmployeeSkill(route.ctx, employeeId, skillId, payload);
    if (!updateResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(updateResult.error, "Unable to update skill"),
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update skill", route.requestId));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; skillId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/skills/[skillId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId, skillId } = await params;
    const deleteResult = await deleteEmployeeSkill(route.ctx, employeeId, skillId);
    if (!deleteResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(deleteResult.error, "Unable to delete skill"),
          mapServiceErrorStatus(deleteResult.error),
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to delete skill", route.requestId));
  }
}
