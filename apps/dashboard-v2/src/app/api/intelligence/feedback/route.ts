import { NextResponse } from "next/server";
import { listSupervisorFeedback, submitSupervisorFeedback } from "@emp/services/intelligence.service";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import type { SupervisorFeedbackInput, SupervisorFeedbackItem } from "@/lib/types/intelligence";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/intelligence/feedback";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId") ?? undefined;

    const result = await listSupervisorFeedback(ctx, employeeId);
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load feedback"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    const mapped = (result.data?.feedback ?? []).map((row: any) => {
      const employee = row.employees as { user_profiles?: { full_name?: string | null; avatar_url?: string | null } | null } | null;
      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        supervisor_employee_id: row.supervisor_employee_id as string,
        category: row.category as SupervisorFeedbackItem["category"],
        feedback_text: row.feedback_text as string,
        feedback_date: (row.feedback_date as string) ?? row.created_at,
        created_at: row.created_at as string,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null
      } satisfies SupervisorFeedbackItem;
    });

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { feedback: mapped } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load feedback", route.requestId));
  }
}

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/intelligence/feedback";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;
    const payload = (await request.json()) as SupervisorFeedbackInput;

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await submitSupervisorFeedback(ctx, payload);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Feedback submission failed") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to submit feedback", route.requestId));
  }
}
