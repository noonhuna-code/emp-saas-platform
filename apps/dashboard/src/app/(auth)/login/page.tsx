import { cookies } from "next/headers";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const cookieStore = await cookies();
  const hasToken = Boolean(cookieStore.get("lf_access_token")?.value);

  if (hasToken) {
    redirect(params.next && params.next.startsWith("/") ? params.next : "/app/dashboard");
  }

  return (
    <div className="auth-shell">
      <section className="card auth-card stack">
        <div>
          <h1>LeaveFlow</h1>
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
          {params.error ? <p className="error">{params.error}</p> : null}
          <button type="submit" className="primary-btn">Sign in</button>
        </form>
        <p className="muted">
          This frontend uses server-side auth wrappers only. Client components do not call Supabase directly.
        </p>
      </section>
    </div>
  );
}
