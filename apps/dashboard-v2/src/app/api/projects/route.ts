import { NextResponse } from "next/server";
import { createProject, type ProjectPayload } from "@emp/services/project.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/projects";

  try {
    const ctx = route.ctx;
    if (!ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const payload = (await request.json()) as ProjectPayload;
    if (!payload?.name?.trim()) {
      return finalizeRoute(route, endpoint, jsonError("Project name is required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await createProject(ctx, { ...payload, name: payload.name.trim() });
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Project creation failed") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to create project", route.requestId));
  }
}
