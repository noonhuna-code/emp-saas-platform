import { NextResponse } from "next/server";
import { addEmployeeSkill, getEmployeeProfile, type EmployeeSkillInput } from "@emp/services/employee.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/skills";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId } = await params;
    const profileResult = await getEmployeeProfile(route.ctx, employeeId);
    if (!profileResult.ok || !profileResult.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(profileResult.error, "Unable to load skills"),
          mapServiceErrorStatus(profileResult.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { skills: profileResult.data.skills } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load skills", route.requestId));
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/skills";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const payload = (await request.json()) as EmployeeSkillInput;
    const { employeeId } = await params;
    const createResult = await addEmployeeSkill(route.ctx, employeeId, payload);
    if (!createResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(createResult.error, "Unable to add skill"),
          mapServiceErrorStatus(createResult.error),
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to add skill", route.requestId));
  }
}
