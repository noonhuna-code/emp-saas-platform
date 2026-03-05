import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { listWorkspaceChatMessages, sendWorkspaceChatMessage } from "@emp/services/employee-workspace.service";

type SendChatBody = {
  recipientEmployeeId?: string;
  message?: string;
};

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/chat";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 50;
    const peerEmployeeId = (url.searchParams.get("peerEmployeeId") ?? "").trim() || undefined;

    const cacheKey = `${route.ctx.companyId}:${route.ctx.userId}:${endpoint}:${limit}:${peerEmployeeId ?? ""}`;
    const cached = getCached<any>(cacheKey, 45000);
    if (cached) {
      return finalizeRoute(
        route,
        endpoint,
        NextResponse.json({ ok: true, data: cached, requestId: route.requestId }, {
          status: 200,
          headers: {
            "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
          }
        })
      );
    }

    const result = await listWorkspaceChatMessages(route.ctx, { peerEmployeeId, limit });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to load chat"), mapServiceErrorStatus(result.error), route.requestId)
      );
    }

    setCached(cacheKey, result.data);

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({ ok: true, data: result.data, requestId: route.requestId }, {
        status: 200,
        headers: {
          "cache-control": "private, max-age=0, s-maxage=15, stale-while-revalidate=30"
        }
      })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load chat", route.requestId));
  }
}

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/chat";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const body = (await request.json()) as SendChatBody;
    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await sendWorkspaceChatMessage(route.ctx!, {
        recipientEmployeeId: String(body.recipientEmployeeId ?? ""),
        message: String(body.message ?? "")
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to send chat message") }
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to send chat message", route.requestId));
  }
}

