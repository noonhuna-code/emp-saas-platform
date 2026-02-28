import { NextResponse } from "next/server";
import { addProjectMember } from "@emp/services/project.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/projects/members";

  try {
    const ctx = route.ctx;
    if (!ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as { projectId?: string; employeeId?: string; role?: string };
    const projectId = body.projectId?.trim() ?? "";
    const employeeId = body.employeeId?.trim() ?? "";
    const role = body.role?.trim() ?? "member";

    if (!projectId || !employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Project and employee are required", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await addProjectMember(ctx, projectId, employeeId, role);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Failed to add project member") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to add project member", route.requestId));
  }
}
