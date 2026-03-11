import { NextResponse } from "next/server";
import { createHmac, createHash, timingSafeEqual } from "crypto";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { processBillingWebhook } from "@emp/services/billing.service";

type WebhookBody = {
  provider?: string;
  providerEventId?: string;
  eventType?: string;
  payloadJson?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/billing/webhooks/process";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const rawBody = await request.text();
    let body: WebhookBody;
    try {
      body = (rawBody ? JSON.parse(rawBody) : {}) as WebhookBody;
    } catch {
      return finalizeRoute(route, endpoint, jsonError("Invalid webhook payload JSON", 400, route.requestId));
    }
    const provider = body.provider?.trim() ?? "";
    const providerEventId = body.providerEventId?.trim() ?? "";
    const eventType = body.eventType?.trim() ?? "";
    const payloadHash = createHash("sha256").update(rawBody || "{}").digest("hex");

    const webhookSecret = process.env.BILLING_WEBHOOK_SHARED_SECRET?.trim() ?? "";
    if (webhookSecret) {
      const signature = (request.headers.get("x-webhook-signature") ?? "").trim();
      if (!signature) {
        return finalizeRoute(route, endpoint, jsonError("Invalid webhook signature", 401, route.requestId));
      }
      const expected = createHmac("sha256", webhookSecret).update(rawBody || "{}").digest("hex");
      const actualBuf = Buffer.from(signature, "hex");
      const expectedBuf = Buffer.from(expected, "hex");
      if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
        return finalizeRoute(route, endpoint, jsonError("Invalid webhook signature", 401, route.requestId));
      }
    }

    if (!provider || !providerEventId || !eventType) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError("Provider, provider event id, and event type are required", 400, route.requestId)
      );
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await processBillingWebhook(route.ctx!, {
        provider,
        providerEventId,
        eventType,
        payloadJson: body.payloadJson ?? {},
        payloadHash
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to process webhook event") }
        };
      }

      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to process webhook event", route.requestId));
  }
}
