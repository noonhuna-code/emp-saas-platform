import { NextResponse } from "next/server";
import { updateTaskStatus } from "@emp/services/project.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/projects/tasks/status";

  try {
    const ctx = route.ctx;
    if (!ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as { taskId?: string; status?: "todo" | "in_progress" | "blocked" | "done" };
    const taskId = body.taskId?.trim() ?? "";
    const status = body.status ?? null;

    if (!taskId || !status) {
      return finalizeRoute(route, endpoint, jsonError("Task and status are required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await updateTaskStatus(ctx, taskId, status);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Task update failed") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update task", route.requestId));
  }
}
