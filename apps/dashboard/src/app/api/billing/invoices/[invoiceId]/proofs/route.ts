import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { listBillingPaymentProofs } from "@emp/services/billing.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/billing/invoices/[invoiceId]/proofs";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { invoiceId } = await params;
    if (!invoiceId?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Invoice id is required", 400, route.requestId));
    }

    const result = await listBillingPaymentProofs(route.ctx, invoiceId.trim());
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load payment proofs"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load payment proofs", route.requestId));
  }
}
