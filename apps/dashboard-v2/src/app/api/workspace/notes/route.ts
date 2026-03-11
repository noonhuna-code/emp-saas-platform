import { NextResponse } from "next/server";
import { getCached, setCached } from "@/lib/server/dashboard-cache";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { createWorkspaceNote, listWorkspaceNotes } from "@emp/services/employee-workspace.service";

type CreateNoteBody = {
  title?: string;
  body?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  isPinned?: boolean;
};

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/notes";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") ?? 30);
    const limit = Number.isFinite(limitRaw) ? limitRaw : 30;

    const cacheKey = `${route.ctx.companyId}:${route.ctx.userId}:${endpoint}:${limit}`;
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

    const result = await listWorkspaceNotes(route.ctx, limit);
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(sanitizeServiceError(result.error, "Unable to load workspace notes"), mapServiceErrorStatus(result.error), route.requestId)
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load workspace notes", route.requestId));
  }
}

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/notes";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const body = (await request.json()) as CreateNoteBody;
    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await createWorkspaceNote(route.ctx!, {
        title: String(body.title ?? ""),
        body: String(body.body ?? ""),
        fileUrl: body.fileUrl ?? null,
        fileName: body.fileName ?? null,
        isPinned: Boolean(body.isPinned)
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to create note") }
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to create note", route.requestId));
  }
}

