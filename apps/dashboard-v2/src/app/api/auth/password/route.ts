import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { getServerSession, revokeAllActiveSessions } from "@/lib/server/auth";
import { createUserScopedSupabaseServerClient } from "@/lib/server/supabase-server";

type PasswordChangeBody = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const clearAuthCookies = (response: NextResponse) => {
  const secure = process.env.NODE_ENV === "production";
  for (const name of ["lf_access_token", "lf_refresh_token", "lf_session", "lf_session_id", "lf_role", "lf_permissions"]) {
    response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", secure, expires: new Date(0) });
  }
};

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/auth/password";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as PasswordChangeBody;
    const currentPassword = String(body.currentPassword ?? "").trim();
    const newPassword = String(body.newPassword ?? "").trim();
    const confirmPassword = String(body.confirmPassword ?? "").trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      return finalizeRoute(route, endpoint, jsonError("All password fields are required", 400, route.requestId));
    }

    if (newPassword.length < 8) {
      return finalizeRoute(route, endpoint, jsonError("New password must be at least 8 characters", 400, route.requestId));
    }

    if (newPassword !== confirmPassword) {
      return finalizeRoute(route, endpoint, jsonError("Password confirmation does not match", 400, route.requestId));
    }

    if (newPassword === currentPassword) {
      return finalizeRoute(route, endpoint, jsonError("New password must be different from your current password", 400, route.requestId));
    }

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const session = await getServerSession();
      if (!session.accessToken || !session.refreshToken || !session.email) {
        return { status: 401, body: { ok: false, error: "Authentication required" } };
      }

      const verifyClient = createUserScopedSupabaseServerClient();
      const verifyResult = await verifyClient.auth.signInWithPassword({
        email: session.email,
        password: currentPassword,
      });

      if (verifyResult.error || !verifyResult.data.session) {
        return { status: 400, body: { ok: false, error: "Current password is incorrect" } };
      }

      const passwordClient = createUserScopedSupabaseServerClient();
      const sessionResult = await passwordClient.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken,
      });

      if (sessionResult.error || !sessionResult.data.session) {
        return {
          status: 401,
          body: { ok: false, error: sessionResult.error?.message || "Authentication required" },
        };
      }

      const updateResult = await passwordClient.auth.updateUser({ password: newPassword });

      if (updateResult.error) {
        return { status: 400, body: { ok: false, error: updateResult.error.message || "Unable to update password" } };
      }

      await revokeAllActiveSessions(route.ctx!, "password_changed");

      return {
        status: 200,
        body: {
          ok: true,
          data: {
            redirectTo: "/login",
            message: "Password updated. Please sign in again.",
          },
        },
      };
    }, { windowSeconds: 300, limit: 5 });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    const response = NextResponse.json(guarded.response.body, { status: guarded.response.status });
    if (guarded.response.status === 200) {
      clearAuthCookies(response);
    }

    return finalizeRoute(route, endpoint, response);
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update password", route.requestId));
  }
}
