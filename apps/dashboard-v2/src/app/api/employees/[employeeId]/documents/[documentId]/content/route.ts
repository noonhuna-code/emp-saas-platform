import { createEmployeeDocumentDownloadUrl } from "@emp/services/document-vault.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; documentId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/employees/[employeeId]/documents/[documentId]/content";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { employeeId, documentId } = await params;
    const url = new URL(request.url);
    const versionId = url.searchParams.get("versionId");
    const forceDownload = url.searchParams.get("download") === "1";

    const downloadResult = await createEmployeeDocumentDownloadUrl(route.ctx, employeeId, documentId, versionId);
    if (!downloadResult.ok || !downloadResult.data?.url) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(downloadResult.error, "Unable to generate document preview"),
          mapServiceErrorStatus(downloadResult.error),
          route.requestId
        )
      );
    }

    const upstream = await fetch(downloadResult.data.url, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError("Unable to load document content", upstream.status || 502, route.requestId)
      );
    }

    const headers = new Headers();
    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const upstreamDisposition = upstream.headers.get("content-disposition");

    headers.set("content-type", contentType);
    headers.set("cache-control", "private, no-store, max-age=0");
    if (contentLength) {
      headers.set("content-length", contentLength);
    }

    if (forceDownload) {
      const fileNameMatch = upstreamDisposition?.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
      const fileName = fileNameMatch?.[1]?.replace(/"/g, "") ?? `${documentId}`;
      headers.set("content-disposition", `attachment; filename="${fileName}"`);
    } else {
      headers.set("content-disposition", "inline");
    }

    return finalizeRoute(
      route,
      endpoint,
      new Response(upstream.body, {
        status: 200,
        headers,
      })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load document content", route.requestId));
  }
}
