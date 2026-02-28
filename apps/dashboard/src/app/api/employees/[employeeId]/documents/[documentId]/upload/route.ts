import { NextResponse } from "next/server";
import { uploadEmployeeDocumentVersion } from "@emp/services/document-vault.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents/[documentId]/upload";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId, documentId } = await params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return finalizeRoute(route, endpoint, jsonError("File is required", 400, route.requestId));
    }

    const uploadResult = await uploadEmployeeDocumentVersion(route.ctx, employeeId, documentId, file);
    if (!uploadResult.ok || !uploadResult.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(uploadResult.error, "Unable to upload document"),
          mapServiceErrorStatus(uploadResult.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: uploadResult.data }, { status: 200 })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to upload document", route.requestId));
  }
}