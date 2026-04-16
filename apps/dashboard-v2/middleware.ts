import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { buildPublicWebsiteUrl } from "./src/lib/site";

const PROTECTED_PREFIX = "/app";
const REFRESH_GRACE_SECONDS = 5 * 60;
const AUTH_COOKIE_NAMES = ["lf_access_token", "lf_refresh_token", "lf_session", "lf_session_id", "lf_role", "lf_permissions"] as const;
const LOGIN_REASON_SESSION_EXPIRED = "session_expired";

const getCookieBaseOptions = (request: NextRequest) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: request.nextUrl.protocol === "https:",
});

const clearAuthCookies = (response: NextResponse, request: NextRequest) => {
  const baseOptions = getCookieBaseOptions(request);
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", { ...baseOptions, expires: new Date(0) });
  }
};

const buildLoginRedirect = (
  request: NextRequest,
  options?: {
    reason?: string;
    clearCookies?: boolean;
  }
) => {
  const url =
    process.env.NODE_ENV === "production"
      ? new URL(buildPublicWebsiteUrl("/sign-in"))
      : request.nextUrl.clone();

  if (process.env.NODE_ENV !== "production") {
    url.pathname = "/login";
  }

  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  if (options?.reason) {
    url.searchParams.set("reason", options.reason);
  }

  const response = NextResponse.redirect(url);

  if (options?.clearCookies) {
    clearAuthCookies(response, request);
  }

  return response;
};

const parseJwtExp = (token?: string | null): number | null => {
  if (!token) return null;
  const parts = token.split(".");
  const payloadPart = parts[1];
  if (!payloadPart) return null;

  try {
    const payload = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(payload)) as { exp?: unknown };
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
};

const shouldRefreshAccessToken = (token?: string | null): boolean => {
  const exp = parseJwtExp(token);
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp - now <= REFRESH_GRACE_SECONDS;
};

const refreshDashboardSession = async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!payload.access_token || !payload.refresh_token) {
    return null;
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
  };
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("lf_access_token")?.value;
  const refreshToken = request.cookies.get("lf_refresh_token")?.value;
  const sessionId = request.cookies.get("lf_session_id")?.value;
  const hasSessionMarker = Boolean(request.cookies.get("lf_session")?.value);
  const hasAnyAuthCookie = Boolean(accessToken || refreshToken || sessionId || hasSessionMarker);

  if ((accessToken || refreshToken || hasSessionMarker) && !sessionId) {
    return buildLoginRedirect(request, {
      reason: LOGIN_REASON_SESSION_EXPIRED,
      clearCookies: true
    });
  }

  if (accessToken && sessionId && !shouldRefreshAccessToken(accessToken)) {
    return NextResponse.next();
  }

  if (refreshToken && sessionId) {
    const session = await refreshDashboardSession(refreshToken);
    if (session) {
      const response = NextResponse.next();
      const baseOptions = getCookieBaseOptions(request);
      response.cookies.set("lf_access_token", session.accessToken, { ...baseOptions, maxAge: 60 * 60 * 24 });
      response.cookies.set("lf_refresh_token", session.refreshToken, { ...baseOptions, maxAge: 60 * 60 * 24 });
      response.cookies.set("lf_session", "1", { ...baseOptions, maxAge: 60 * 60 * 24 });
      return response;
    }

    return buildLoginRedirect(request, {
      reason: LOGIN_REASON_SESSION_EXPIRED,
      clearCookies: true
    });
  }

  if (hasAnyAuthCookie) {
    return buildLoginRedirect(request, {
      reason: LOGIN_REASON_SESSION_EXPIRED,
      clearCookies: true
    });
  }

  return buildLoginRedirect(request);
}

export const config = {
  matcher: ["/app/:path*"]
};
