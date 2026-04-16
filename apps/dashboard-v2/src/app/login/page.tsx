import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/server/auth";
import { buildPublicWebsiteUrl, publicWebsiteUrl, resolveSafeExternalReturnTo } from "@/lib/site";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string; error?: string; reason?: string; returnTo?: string }>;
};

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  PROVISIONING_INCOMPLETE: "Account setup is incomplete. Contact your administrator.",
  ROLE_MISSING: "No role assignment found for this account. Contact your administrator.",
  INTERNAL_ERROR: "Unable to sign in right now. Please try again.",
  RATE_LIMITED: "Too many login attempts. Please try again later."
};

const LOGIN_NOTICE_MESSAGES: Record<string, string> = {
  signed_out: "You have been signed out successfully.",
  session_expired: "Your session expired or became invalid. Please sign in again."
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const session = await getServerSession();
  const errorMessage = params.error ? (LOGIN_ERROR_MESSAGES[params.error] ?? params.error) : null;
  const noticeMessage = params.reason ? (LOGIN_NOTICE_MESSAGES[params.reason] ?? null) : null;
  const safeReturnTo = params.returnTo ? resolveSafeExternalReturnTo(params.returnTo, "/sign-in") : null;
  const safeNext = params.next && params.next.startsWith("/") ? params.next : "/app/dashboard";

  if (session.accessToken) {
    redirect(safeNext);
  }

  if (process.env.NODE_ENV === "production") {
    redirect(
      buildPublicWebsiteUrl("/sign-in", {
        next: safeNext,
        error: params.error ?? null,
        reason: params.reason ?? null
      })
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <section className="hidden border-r border-gray-200 bg-white px-8 py-10 dark:border-gray-800 dark:bg-gray-900 lg:flex lg:flex-col lg:justify-between xl:px-12">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-sm font-semibold tracking-[0.22em] text-white shadow-theme-md">
              EMP
            </div>
            <div className="mt-8 max-w-xl">
              <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                TailAdmin Workspace
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-gray-900 dark:text-white/90 xl:text-[3.25rem]">
                Sign in to EMP workforce operations.
              </h1>
              <p className="mt-5 text-base leading-8 text-gray-500 dark:text-gray-400">
                Access the employee management, approvals, attendance, payroll visibility, monitoring, and internal operating surfaces from one protected workspace.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "Role-aware workspace routing",
              "Protected server-side auth session",
              "Built for mobile and desktop access"
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm leading-6 text-gray-600 dark:border-gray-800 dark:bg-gray-800/80 dark:text-gray-300"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-[460px] rounded-3xl border border-gray-200 bg-white p-6 shadow-[0_20px_40px_rgba(16,24,40,0.08)] dark:border-gray-800 dark:bg-gray-900 sm:p-8">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">EMP SaaS Platform</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-gray-900 dark:text-white/90">
                Welcome back
              </h2>
              <p className="mt-3 text-sm leading-7 text-gray-500 dark:text-gray-400">
                Use your work credentials to continue into the EMP dashboard.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <Link
                href={publicWebsiteUrl}
                className="font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Back to website
              </Link>
              <Link
                href={buildPublicWebsiteUrl("/sign-up")}
                className="font-medium text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Request access
              </Link>
            </div>

            <form className="mt-8 grid gap-5" action="/api/auth/login" method="post">
              <input type="hidden" name="next" value={safeNext} />
              {safeReturnTo ? <input type="hidden" name="returnTo" value={safeReturnTo} /> : null}
              <label className="grid gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  className="h-11 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="you@company.com"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
                <input
                  type="password"
                  name="password"
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-xl border border-gray-300 bg-transparent px-4 text-sm text-gray-900 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="Enter your password"
                />
              </label>
              {errorMessage ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  {errorMessage}
                </div>
              ) : null}
              {noticeMessage ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {noticeMessage}
                </div>
              ) : null}
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600"
              >
                Sign in
              </button>
            </form>

            <p className="mt-6 text-sm leading-7 text-gray-500 dark:text-gray-400">
              This dashboard uses server-side auth wrappers only. Client components do not call Supabase directly.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
