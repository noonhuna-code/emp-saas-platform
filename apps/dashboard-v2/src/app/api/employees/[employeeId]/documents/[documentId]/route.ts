import { NextResponse } from "next/server";
import { deleteEmployeeDocument, getEmployeeProfile, type EmployeeDocumentInput, updateEmployeeDocument } from "@emp/services/employee.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents/[documentId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const payload = (await request.json()) as EmployeeDocumentInput;
    const { employeeId, documentId } = await params;
    const updateResult = await updateEmployeeDocument(route.ctx, employeeId, documentId, payload);
    if (!updateResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(updateResult.error, "Unable to update document"),
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update document", route.requestId));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents/[documentId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId, documentId } = await params;
    const deleteResult = await deleteEmployeeDocument(route.ctx, employeeId, documentId);
    if (!deleteResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(deleteResult.error, "Unable to delete document"),
          mapServiceErrorStatus(deleteResult.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { id: documentId } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to delete document", route.requestId));
  }
}
