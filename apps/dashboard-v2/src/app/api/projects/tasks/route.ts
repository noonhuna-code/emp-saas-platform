import { NextResponse } from "next/server";
import { createTask, listProjectTasks, type ProjectTaskPayload } from "@emp/services/project.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/projects/tasks";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? "60");
    const safeLimit = Number.isFinite(limit) ? limit : 60;
    const projectId = searchParams.get("projectId");

    const result = await listProjectTasks(route.ctx, { limit: safeLimit, projectId });
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load project tasks"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load project tasks", route.requestId));
  }
}

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/projects/tasks";

  try {
    const ctx = route.ctx;
    if (!ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as { projectId?: string } & ProjectTaskPayload;
    const projectId = body.projectId?.trim() ?? "";

    if (!projectId || !body?.title?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Project and task title are required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await createTask(ctx, projectId, { ...body, title: body.title.trim() });
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Task creation failed") }
        };
      }
      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json(guarded.response.body, { status: guarded.response.status })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to create task", route.requestId));
  }
}
