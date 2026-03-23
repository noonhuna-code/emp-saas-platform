import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string; error?: string }>;
};

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  PROVISIONING_INCOMPLETE: "Account setup is incomplete. Contact your administrator.",
  ROLE_MISSING: "No role assignment found for this account. Contact your administrator.",
  INTERNAL_ERROR: "Unable to sign in right now. Please try again.",
  RATE_LIMITED: "Too many login attempts. Please try again later."
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const session = await getServerSession();
  const errorMessage = params.error ? (LOGIN_ERROR_MESSAGES[params.error] ?? params.error) : null;

  if (session.accessToken) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/app/dashboard");
  }

  return (
    <div className="auth-shell">
      <section className="card auth-card stack">
        <div>
          <h1>EMP SaaS Platform</h1>
          <p className="muted">Phase 1 dashboard access</p>
        </div>
        <form className="form-grid" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={params.next ?? "/app/dashboard"} />
          <label>
            Email
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          {errorMessage ? <p className="error">{errorMessage}</p> : null}
          <button type="submit" className="primary-btn">Sign in</button>
        </form>
        <p className="muted">
          This frontend uses server-side auth wrappers only. Client components do not call Supabase directly.
        </p>
      </section>
    </div>
  );
}
