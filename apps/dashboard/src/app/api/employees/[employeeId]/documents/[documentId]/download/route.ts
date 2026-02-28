import { NextResponse } from "next/server";
import { createEmployeeDocumentDownloadUrl } from "@emp/services/document-vault.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents/[documentId]/download";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId, documentId } = await params;
    const url = new URL(request.url);
    const versionId = url.searchParams.get("versionId");

    const downloadResult = await createEmployeeDocumentDownloadUrl(route.ctx, employeeId, documentId, versionId);
    if (!downloadResult.ok || !downloadResult.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(downloadResult.error, "Unable to generate download link"),
          mapServiceErrorStatus(downloadResult.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: downloadResult.data }, { status: 200 })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to generate download link", route.requestId));
  }
}