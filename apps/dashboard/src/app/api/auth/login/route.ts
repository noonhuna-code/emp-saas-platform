import { NextResponse } from "next/server";
import { createUserScopedSupabaseServerClient } from "@/lib/server/supabase-server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { enforceAuthRateLimit } from "@emp/lib/auth-rate-limit";
import { getDeviceFingerprintHash } from "@emp/lib/device-fingerprint";
import { getEmailHash, getGeoCountry, getIpHash } from "@emp/lib/login-risk";
import {
  evaluateLoginRisk,
  recordAccountLockEvent,
  recordLoginEvent,
  recordLoginEventAnon,
  recordMfaTrigger,
  upsertDeviceFingerprint
} from "@emp/services/security.service";
import { buildAuthContextFromAccessToken, createAuthSession, revokeAllActiveSessions } from "@/lib/server/auth";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/auth/login";
  const MFA_THRESHOLD = 60;
  const HARD_FLAG_THRESHOLD = 80;
  const LOCK_THRESHOLD = 90;

  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app/dashboard");

  if (!email || !password) {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Email and password are required")}`, request.url)
    );
    return finalizeRoute(route, endpoint, response);
  }

  const supabase = createUserScopedSupabaseServerClient();
  const ipHash = getIpHash(request);
  const deviceHash = getDeviceFingerprintHash(request);
  const emailHash = getEmailHash(email);
  const geoCountry = getGeoCountry(request);

  try {
    await enforceAuthRateLimit(supabase, request, {
      email,
      includeEmail: true,
      includeIp: true,
      windowSeconds: 60,
      maxAttempts: 5,
      lockMinutes: 5
    });
  } catch {
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Too many login attempts. Please try again later.")}`, request.url),
      { status: 429 }
    );
    return finalizeRoute(route, endpoint, response);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    if (emailHash && ipHash) {
      await recordLoginEventAnon(supabase, {
        emailHash,
        ipHash,
        deviceHash,
        geoCountry,
        success: false,
        riskScore: 0
      });
    }
    const response = NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Invalid credentials")}`, request.url));
    return finalizeRoute(route, endpoint, response);
  }

  let shouldLock = false;
  let cachedAuthContext: Awaited<ReturnType<typeof buildAuthContextFromAccessToken>> | null = null;

  try {
    const authContext = await buildAuthContextFromAccessToken(data.session.access_token);
    const ctx = { ...authContext, requestId: route.requestId };
    cachedAuthContext = authContext;
    if (emailHash && ipHash) {
      const riskResult = await evaluateLoginRisk(ctx, { ipHash, deviceHash, geoCountry });
      const riskScore = riskResult.ok ? riskResult.data?.score ?? 0 : 0;

      await recordLoginEvent(ctx, {
        emailHash,
        ipHash,
        deviceHash,
        geoCountry,
        success: true,
        riskScore
      });

      if (deviceHash) {
        await upsertDeviceFingerprint(ctx, { deviceHash, riskScore });
      }

      if (riskScore >= MFA_THRESHOLD) {
        const reason =
          riskScore >= LOCK_THRESHOLD
            ? "Lock threshold met"
            : riskScore >= HARD_FLAG_THRESHOLD
              ? "Security attention threshold met"
              : "Step-up MFA threshold met";
        await recordMfaTrigger(ctx, {
          riskScore,
          reason
        });
      }

      if (riskScore >= LOCK_THRESHOLD) {
        await recordAccountLockEvent(ctx, {
          emailHash,
          lockReason: "High login risk score",
          lockDurationMinutes: 15,
          triggeredBy: "risk_score"
        });
        shouldLock = true;
      }
    }
  } catch {
    // Swallow security telemetry failures to avoid breaking login.
  }

  if (shouldLock) {
    try {
      if (cachedAuthContext) {
        await revokeAllActiveSessions(cachedAuthContext, "risk_lock");
      }
      await supabase.auth.signOut();
    } catch {
      // Ignore sign-out failures; we still clear cookies.
    }
    const response = NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Too many login attempts. Please try again later.")}`, request.url),
      { status: 429 }
    );
    for (const name of ["lf_access_token", "lf_refresh_token", "lf_session", "lf_session_id", "lf_role", "lf_permissions"]) {
      response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
    }
    return finalizeRoute(route, endpoint, response);
  }

  const authContext = cachedAuthContext ?? (await buildAuthContextFromAccessToken(data.session.access_token));
  const sessionId = await createAuthSession(authContext, route.requestId);
  const response = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/app/dashboard", request.url));
  response.cookies.set("lf_access_token", data.session.access_token, { httpOnly: true, sameSite: "lax", path: "/" });
  response.cookies.set("lf_refresh_token", data.session.refresh_token, { httpOnly: true, sameSite: "lax", path: "/" });
  response.cookies.set("lf_session", "1", { httpOnly: true, sameSite: "lax", path: "/" });
  response.cookies.set("lf_session_id", sessionId, { httpOnly: true, sameSite: "lax", path: "/" });

  // TODO: Populate lf_role and lf_permissions cookies from a trusted server-side auth context resolver.

  return finalizeRoute(route, endpoint, response);
}
