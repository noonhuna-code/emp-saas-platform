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
import { auditAuthByUserId } from "@/lib/server/auth-audit";

type LoginErrorCode =
  | "INVALID_CREDENTIALS"
  | "PROVISIONING_INCOMPLETE"
  | "ROLE_MISSING"
  | "INTERNAL_ERROR"
  | "RATE_LIMITED";

const redirectToLoginWithErrorCode = (request: Request, code: LoginErrorCode): NextResponse => {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(code)}`, request.url));
};

const parseLoginInput = async (request: Request): Promise<{ email: string; password: string; next: string }> => {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { email?: string; password?: string; next?: string } | null;
    return {
      email: String(body?.email ?? "").trim(),
      password: String(body?.password ?? ""),
      next: String(body?.next ?? "/app/dashboard")
    };
  }

  const formData = await request.formData();
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "/app/dashboard")
  };
};

const logAuthStage = (requestId: string, stage: string, meta: Record<string, unknown> = {}): void => {
  console.info("[auth.login]", JSON.stringify({ requestId, stage, ...meta }));
};

const mapLoginErrorCode = (error: unknown): LoginErrorCode => {
  if (!(error instanceof Error)) {
    return "INTERNAL_ERROR";
  }

  if (error.message.includes("Authenticated company-scoped session required")) {
    return "PROVISIONING_INCOMPLETE";
  }

  if (error.message === "ROLE_MISSING") {
    return "ROLE_MISSING";
  }

  if (error.message === "AUTH_SESSION_CREATE_FAILED") {
    return "PROVISIONING_INCOMPLETE";
  }

  if (error.message.includes("Invalid login credentials")) {
    return "INVALID_CREDENTIALS";
  }

  return "INTERNAL_ERROR";
};

export async function GET(request: Request) {
  const route = await beginRoute();
  const response = NextResponse.redirect(new URL("/login", request.url));
  return finalizeRoute(route, "/api/auth/login", response);
}

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/auth/login";
  const MFA_THRESHOLD = 60;
  const HARD_FLAG_THRESHOLD = 80;
  const LOCK_THRESHOLD = 90;

  try {
    const { email, password, next } = await parseLoginInput(request);

    if (!email || !password) {
      const response = redirectToLoginWithErrorCode(request, "INTERNAL_ERROR");
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
    } catch (rateLimitError) {
      const reason = rateLimitError instanceof Error ? rateLimitError.message : "UNKNOWN_RATE_LIMIT_ERROR";
      const isBlocked = reason.includes("AUTH_RATE_LIMITED");
      logAuthStage(route.requestId, isBlocked ? "rate_limit_blocked" : "rate_limit_unavailable", { emailHash, reason });
      if (isBlocked) {
        const response = redirectToLoginWithErrorCode(request, "RATE_LIMITED");
        return finalizeRoute(route, endpoint, response);
      }
    }

    logAuthStage(route.requestId, "before_sign_in", { emailHash });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    logAuthStage(route.requestId, "after_sign_in", {
      emailHash,
      signInError: Boolean(error),
      hasSession: Boolean(data?.session),
      hasUser: Boolean(data?.user?.id)
    });

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
      const response = redirectToLoginWithErrorCode(request, "INVALID_CREDENTIALS");
      return finalizeRoute(route, endpoint, response);
    }

    try {
      if (data.user?.id) {
        const audit = await auditAuthByUserId(data.user.id, { autoHeal: true });
        logAuthStage(route.requestId, "post_sign_in_audit", {
          authUser: audit.authUser,
          profile: audit.profile,
          membership: audit.membership,
          platformRole: audit.platformRole,
          profileCreated: audit.healed.profileCreated,
          membershipCreated: audit.healed.membershipCreated,
          platformRoleAssigned: audit.healed.platformRoleAssigned
        });

        if (audit.profile !== "exists") {
          await supabase.auth.signOut();
          const response = redirectToLoginWithErrorCode(request, "PROVISIONING_INCOMPLETE");
          return finalizeRoute(route, endpoint, response);
        }

        if (audit.membership !== "exists") {
          await supabase.auth.signOut();
          const response = redirectToLoginWithErrorCode(request, "ROLE_MISSING");
          return finalizeRoute(route, endpoint, response);
        }
      }
    } catch (errorAudit) {
      logAuthStage(route.requestId, "post_sign_in_audit_failed", {
        error: errorAudit instanceof Error ? errorAudit.message : "Unknown error"
      });
      const code = mapLoginErrorCode(errorAudit);
      await supabase.auth.signOut();
      const response = redirectToLoginWithErrorCode(request, code);
      return finalizeRoute(route, endpoint, response);
    }

    let shouldLock = false;
    let cachedAuthContext: Awaited<ReturnType<typeof buildAuthContextFromAccessToken>> | null = null;

    try {
      logAuthStage(route.requestId, "before_build_auth_context", { emailHash });
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
      // Security telemetry should not block login.
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
      const response = redirectToLoginWithErrorCode(request, "RATE_LIMITED");
      for (const name of ["lf_access_token", "lf_refresh_token", "lf_session", "lf_session_id", "lf_role", "lf_permissions"]) {
        response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", expires: new Date(0) });
      }
      return finalizeRoute(route, endpoint, response);
    }

    try {
      logAuthStage(route.requestId, "before_create_auth_session", { emailHash });
      const authContext = cachedAuthContext ?? (await buildAuthContextFromAccessToken(data.session.access_token));
      const sessionId = await createAuthSession(authContext, route.requestId);
      const response = NextResponse.redirect(new URL(next.startsWith("/") ? next : "/app/dashboard", request.url));
      response.cookies.set("lf_access_token", data.session.access_token, { httpOnly: true, sameSite: "lax", path: "/" });
      response.cookies.set("lf_refresh_token", data.session.refresh_token, { httpOnly: true, sameSite: "lax", path: "/" });
      response.cookies.set("lf_session", "1", { httpOnly: true, sameSite: "lax", path: "/" });
      response.cookies.set("lf_session_id", sessionId, { httpOnly: true, sameSite: "lax", path: "/" });

      return finalizeRoute(route, endpoint, response);
    } catch (errorFinal) {
      logAuthStage(route.requestId, "create_auth_session_failed", {
        error: errorFinal instanceof Error ? errorFinal.message : "Unknown error"
      });
      await supabase.auth.signOut();
      const response = redirectToLoginWithErrorCode(request, mapLoginErrorCode(errorFinal));
      return finalizeRoute(route, endpoint, response);
    }
  } catch (errorTop) {
    logAuthStage(route.requestId, "login_route_failed", {
      error: errorTop instanceof Error ? errorTop.message : "Unknown error"
    });
    const response = redirectToLoginWithErrorCode(request, mapLoginErrorCode(errorTop));
    return finalizeRoute(route, endpoint, response);
  }
}
