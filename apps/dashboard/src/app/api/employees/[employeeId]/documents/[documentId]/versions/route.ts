import { NextResponse } from "next/server";
import { listEmployeeDocumentVersions } from "@emp/services/document-vault.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents/[documentId]/versions";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId, documentId } = await params;
    const versionsResult = await listEmployeeDocumentVersions(route.ctx, employeeId, documentId);
    if (!versionsResult.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(versionsResult.error, "Unable to load document versions"),
          mapServiceErrorStatus(versionsResult.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: { versions: versionsResult.data ?? [] } }, { status: 200 })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load document versions", route.requestId));
  }
}