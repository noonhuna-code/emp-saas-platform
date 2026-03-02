import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { createShiftSwapRequest, listShiftSwapRequests } from "@emp/services/attendance.service";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/shift-swaps";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const url = new URL(request.url);
    const scopeRaw = (url.searchParams.get("scope") ?? "mine").trim();
    const statusRaw = url.searchParams.get("status");
    const limitRaw = Number(url.searchParams.get("limit") ?? 100);
    const scope = scopeRaw === "review" ? "review" : "mine";
    const status = statusRaw === "pending" || statusRaw === "approved" || statusRaw === "rejected" ? statusRaw : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

    const result = await listShiftSwapRequests(route.ctx, { scope, status, limit });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to load shift swap requests"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load shift swap requests", route.requestId));
  }
}

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/attendance/shift-swaps";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as {
      attendanceDate?: string;
      requestedShiftTemplateId?: string;
      reason?: string;
    } | null;

    const result = await createShiftSwapRequest(route.ctx, {
      attendanceDate: String(body?.attendanceDate ?? ""),
      requestedShiftTemplateId: String(body?.requestedShiftTemplateId ?? ""),
      reason: String(body?.reason ?? "")
    });

    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to create shift swap request"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to create shift swap request", route.requestId));
  }
}
