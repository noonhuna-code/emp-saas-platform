import { NextResponse } from "next/server";
import { addEmployeeDocument, getEmployeeProfile, type EmployeeDocumentInput } from "@emp/services/employee.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents";

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
          sanitizeServiceError(profileResult.error, "Unable to load documents"),
          mapServiceErrorStatus(profileResult.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { documents: profileResult.data.documents } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load documents", route.requestId));
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const payload = (await request.json()) as EmployeeDocumentInput;
    const { employeeId } = await params;
    const createResult = await addEmployeeDocument(route.ctx, employeeId, payload);
    if (!createResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(createResult.error, "Unable to add document"),
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to add document", route.requestId));
  }
}
