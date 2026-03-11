import { getPayslipDetail } from "@emp/services/payroll.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { buildPayslipPdfFilename, renderPayslipPdf } from "@/lib/server/payslip-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/payslips/[entryId]/pdf";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { entryId } = await params;
    const result = await getPayslipDetail(route.ctx, entryId);
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to generate payslip PDF"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    const pdfBytes = await renderPayslipPdf(result.data);
    const filename = buildPayslipPdfFilename(result.data);
    const pdfBuffer = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBuffer).set(pdfBytes);

    return finalizeRoute(
      route,
      endpoint,
      new Response(pdfBuffer, {
        status: 200,
        headers: {
          "content-type": "application/pdf",
          "content-disposition": `attachment; filename=\"${filename}\"`,
          "cache-control": "private, no-store, no-cache, must-revalidate",
          "content-length": String(pdfBytes.byteLength)
        }
      })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to generate payslip PDF", route.requestId));
  }
}
