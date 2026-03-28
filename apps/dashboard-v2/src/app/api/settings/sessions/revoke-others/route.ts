import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { getServerSession } from "@/lib/server/auth";
import { revokeOtherSettingsSessions } from "@emp/services/settings.service";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/settings/sessions/revoke-others";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const session = await getServerSession();
    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await revokeOtherSettingsSessions(route.ctx!, session.sessionId);
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? "Unable to revoke other sessions");
      }

      return {
        status: 200,
        body: { ok: true, data: result.data },
      };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to revoke other sessions", route.requestId));
  }
}
