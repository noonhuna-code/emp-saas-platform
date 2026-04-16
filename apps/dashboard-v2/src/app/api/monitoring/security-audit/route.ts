import { NextResponse } from "next/server";
import { listSecurityAuditTimeline, type SecurityAuditTimelineEventType } from "@emp/services/security.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

const parseEventType = (value: string | null): SecurityAuditTimelineEventType | undefined => {
  if (!value) return undefined;
  if (value === "login" || value === "account_lock" || value === "mfa_trigger") {
    return value;
  }
  return undefined;
};

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/monitoring/security-audit";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 50;
    const from = url.searchParams.get("from") ?? undefined;
    const to = url.searchParams.get("to") ?? undefined;
    const eventType = parseEventType(url.searchParams.get("eventType"));

    const result = await listSecurityAuditTimeline(route.ctx, { from, to, limit, eventType });
    if (!result.ok) {
      const errorMessage = result.error === "Feature disabled by current plan"
        ? result.error
        : sanitizeServiceError(result.error, "Unable to load security audit timeline");
      return finalizeRoute(
        route,
        endpoint,
        jsonError(errorMessage, mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load security audit timeline", route.requestId));
  }
}
