import { NextResponse } from "next/server";
import { listKudosHistory, sendKudos } from "@emp/services/intelligence.service";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import type { KudosInput, KudosItem } from "@/lib/types/intelligence";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/intelligence/kudos";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;
    const url = new URL(request.url);
    const employeeId = url.searchParams.get("employeeId") ?? undefined;

    const result = await listKudosHistory(ctx, employeeId);
    if (!result.ok) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load kudos history"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    const mapped = (result.data?.kudos ?? []).map((row: any) => {
      const employee = row.employees as { user_profiles?: { full_name?: string | null } | null } | null;
      return {
        id: row.id as string,
        sender_employee_id: row.sender_employee_id as string,
        receiver_employee_id: row.receiver_employee_id as string,
        points: Number(row.points ?? 0),
        message: row.message as string | null,
        month_bucket_utc: row.month_bucket_utc as string,
        created_at: row.created_at as string,
        receiver_name: employee?.user_profiles?.full_name ?? null
      } satisfies KudosItem;
    });

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: { kudos: mapped } }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load kudos history", route.requestId));
  }
}

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/intelligence/kudos";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const ctx = route.ctx;
    const payload = (await request.json()) as KudosInput;

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await sendKudos(ctx, payload);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Kudos submission failed") }
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
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to submit kudos", route.requestId));
  }
}
