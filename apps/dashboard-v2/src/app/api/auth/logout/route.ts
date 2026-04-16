import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { createUserScopedSupabaseServerClient } from "@/lib/server/supabase-server";
import { enforceAuthRateLimit } from "@emp/lib/auth-rate-limit";
import { revokeAuthSession } from "@/lib/server/auth";
import { buildPublicWebsiteUrl, resolveSafeExternalReturnTo } from "@/lib/site";

const clearAuthCookies = (response: NextResponse) => {
  const secure = process.env.NODE_ENV === "production";
  for (const name of ["lf_access_token", "lf_refresh_token", "lf_session", "lf_session_id", "lf_role", "lf_permissions"]) {
    response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", secure, expires: new Date(0) });
  }
};

const buildSafeRedirect = (
  request: Request,
  target = "/login",
  searchParams?: Record<string, string>,
  returnTo?: string | null,
  status = 307
) => {
  const url = returnTo
    ? new URL(resolveSafeExternalReturnTo(returnTo))
    : process.env.NODE_ENV === "production"
      ? new URL(buildPublicWebsiteUrl("/sign-in"))
      : new URL(target, request.url);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }

  const response = NextResponse.redirect(url, { status });
  clearAuthCookies(response);
  return response;
};

const handleLogout = async (request: Request, applyRateLimit: boolean) => {
  const route = await beginRoute();
  const endpoint = "/api/auth/logout";
  const returnTo =
    request.method === "POST"
      ? String((await request.clone().formData().catch(() => new FormData())).get("returnTo") ?? "").trim() || null
      : new URL(request.url).searchParams.get("returnTo");

  try {
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
        const response = buildSafeRedirect(
          request,
          "/login",
          { error: "Too many requests. Try again later." },
          returnTo,
          429
        );
        return finalizeRoute(route, endpoint, response);
      }
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("lf_access_token")?.value ?? null;
    const sessionId = cookieStore.get("lf_session_id")?.value ?? null;
    if (accessToken && sessionId) {
      try {
        await revokeAuthSession(accessToken, sessionId, "logout");
      } catch {
        // best-effort revoke only
      }
    }

    return finalizeRoute(route, endpoint, buildSafeRedirect(request, "/login", { reason: "signed_out" }, returnTo));
  } catch {
    return finalizeRoute(route, endpoint, buildSafeRedirect(request, "/login", { reason: "signed_out" }, returnTo));
  }
};

export async function GET(request: Request) {
  return handleLogout(request, false);
}

export async function POST(request: Request) {
  return handleLogout(request, true);
}
