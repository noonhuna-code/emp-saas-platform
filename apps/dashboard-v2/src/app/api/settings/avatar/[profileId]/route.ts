import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { createSettingsAvatarDownloadUrl } from "@emp/services/settings.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/settings/avatar/[profileId]";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { profileId } = await params;
    const result = await createSettingsAvatarDownloadUrl(route.ctx, profileId);

    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load avatar"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.redirect(result.data.url, { status: 307 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load avatar", route.requestId));
  }
}
