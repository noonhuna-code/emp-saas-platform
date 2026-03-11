import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { markBillingInvoicePaid } from "@emp/services/billing.service";

type MarkPaidBody = {
  paidAmountMinor?: number;
  paidCurrencyCode?: string;
  paymentReference?: string;
  paymentProvider?: string;
  paidAt?: string;
  approvalReason?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/billing/invoices/[invoiceId]/mark-paid";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { invoiceId } = await params;
    if (!invoiceId?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Invoice id is required", 400, route.requestId));
    }

    const body = (await request.json()) as MarkPaidBody;
    if (!Number.isFinite(body.paidAmountMinor) || !body.paidCurrencyCode?.trim() || !body.approvalReason?.trim()) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError("paidAmountMinor, paidCurrencyCode, and approvalReason are required", 400, route.requestId)
      );
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await markBillingInvoicePaid(route.ctx!, invoiceId.trim(), {
        paidAmountMinor: Number(body.paidAmountMinor),
        paidCurrencyCode: body.paidCurrencyCode,
        paymentReference: body.paymentReference,
        paymentProvider: body.paymentProvider,
        paidAt: body.paidAt,
        approvalReason: body.approvalReason
      });
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to mark invoice as paid") }
        };
      }
      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to mark invoice as paid", route.requestId));
  }
}
