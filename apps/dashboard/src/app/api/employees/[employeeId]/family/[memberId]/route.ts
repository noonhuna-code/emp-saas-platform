import { NextResponse } from "next/server";
import { deleteEmployeeFamilyMember, getEmployeeProfile, updateEmployeeFamilyMember, type EmployeeFamilyInput } from "@emp/services/employee.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; memberId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/family/[memberId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const payload = (await request.json()) as EmployeeFamilyInput;
    const { employeeId, memberId } = await params;
    const updateResult = await updateEmployeeFamilyMember(route.ctx, employeeId, memberId, payload);
    if (!updateResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(updateResult.error, "Unable to update family member"),
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update family member", route.requestId));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; memberId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/family/[memberId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId, memberId } = await params;
    const deleteResult = await deleteEmployeeFamilyMember(route.ctx, employeeId, memberId);
    if (!deleteResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(deleteResult.error, "Unable to delete family member"),
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to delete family member", route.requestId));
  }
}
