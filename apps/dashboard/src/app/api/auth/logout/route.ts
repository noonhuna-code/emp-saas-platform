import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { createUserScopedSupabaseServerClient } from "@/lib/server/supabase-server";
import { enforceAuthRateLimit } from "@emp/lib/auth-rate-limit";
import { revokeAuthSession } from "@/lib/server/auth";

const clearAuthCookies = (response: NextResponse) => {
  for (const name of ["lf_access_token", "lf_refresh_token", "lf_session", "lf_session_id", "lf_role", "lf_permissions"]) {
    response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
  }
};

const handleLogout = async (request: Request, applyRateLimit: boolean) => {
  const route = await beginRoute();
  const endpoint = "/api/auth/logout";

  if (applyRateLimit) {
    try {
      const supabase = createUserScopedSupabaseServerClient();
      await enforceAuthRateLimit(supabase, request, {
        includeIp: true,
        includeEmail: false,
        windowSeconds: 60,
        maxAttempts: 60,
        lockMinutes: 1
      });
    } catch {
      const response = NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent("Too many requests. Try again later.")}`, request.url),
        { status: 429 }
      );
      return finalizeRoute(route, endpoint, response);
    }
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("lf_access_token")?.value ?? null;
  const sessionId = cookieStore.get("lf_session_id")?.value ?? null;
  if (accessToken && sessionId) {
    try {
      await revokeAuthSession(accessToken, sessionId, "logout");
    } catch {
      // best-effort revoke
    }
  }

  clearAuthCookies(response);
  return finalizeRoute(route, endpoint, response);
};

export async function GET(request: Request) {
  return handleLogout(request, false);
}

export async function POST(request: Request) {
  return handleLogout(request, true);
}
