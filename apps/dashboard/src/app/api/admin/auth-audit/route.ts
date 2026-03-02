import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { jsonError, handleRouteError } from "@/lib/server/api-errors";
import { auditAuthByEmail } from "@/lib/server/auth-audit";

const canRunAuthAudit = (permissions: string[]): boolean => {
  const allowed = ["manage_company", "manage_roles", "view_all_companies", "approve_billing_payments"];
  return allowed.some((permission) => permissions.includes(permission));
};

export async function GET(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/admin/auth-audit";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    if (!canRunAuthAudit(route.ctx.permissions)) {
      return finalizeRoute(route, endpoint, jsonError("Permission denied", 403, route.requestId));
    }

    const url = new URL(request.url);
    const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
    const autoHeal = ["1", "true", "yes"].includes((url.searchParams.get("heal") ?? "").trim().toLowerCase());

    if (!email || !email.includes("@")) {
      return finalizeRoute(route, endpoint, jsonError("Valid email query parameter is required", 400, route.requestId));
    }

    const audit = await auditAuthByEmail(email, { autoHeal });
    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json(
        {
          ok: true,
          data: {
            authUser: audit.authUser,
            profile: audit.profile,
            membership: audit.membership,
            platformRole: audit.platformRole,
            userId: audit.userId,
            companyId: audit.companyId,
            profileId: audit.profileId,
            healed: audit.healed,
            notes: audit.notes
          }
        },
        { status: 200 }
      )
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to run auth audit", route.requestId));
  }
}

