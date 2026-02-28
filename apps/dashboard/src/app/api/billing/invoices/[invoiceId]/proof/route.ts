import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { submitBillingPaymentProof } from "@emp/services/billing.service";

type SubmitProofBody = {
  proofStoragePath?: string;
  proofContentHash?: string;
  amountMinor?: number;
  currencyCode?: string;
  referenceNumber?: string;
  paymentMethod?: "bank_transfer" | "jazzcash" | "stripe" | "manual";
  paymentDate?: string;
  notes?: string;
  supersedesProofId?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/billing/invoices/[invoiceId]/proof";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { invoiceId } = await params;
    if (!invoiceId?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Invoice id is required", 400, route.requestId));
    }

    const body = (await request.json()) as SubmitProofBody;
    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await submitBillingPaymentProof(route.ctx!, invoiceId.trim(), {
        proofStoragePath: body.proofStoragePath ?? "",
        proofContentHash: body.proofContentHash ?? "",
        amountMinor: Number(body.amountMinor),
        currencyCode: body.currencyCode ?? "",
        referenceNumber: body.referenceNumber ?? "",
        paymentMethod: body.paymentMethod,
        paymentDate: body.paymentDate,
        notes: body.notes,
        supersedesProofId: body.supersedesProofId
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to submit payment proof") }
        };
      }

      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to submit payment proof", route.requestId));
  }
}
