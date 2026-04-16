"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
  actionUrl?: string;
  nextPath?: string;
  returnTo?: string;
  initialError?: string | null;
  initialNotice?: string | null;
};

export function AuthForm({
  mode,
  actionUrl,
  nextPath = "/app/dashboard",
  returnTo,
  initialError = null,
  initialNotice = null
}: AuthFormProps) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const isSignIn = mode === "sign-in";
  const pathname = usePathname();

  return (
    <div className="surface rounded-[1.8rem] border border-slate-200/80 bg-white/94 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] sm:p-6">
      {submitted ? (
        <div aria-live="polite" className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-6" role="status">
          <p className="eyebrow !border-emerald-200 !bg-white !text-emerald-700">
            Access request received
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">
            {isSignIn ? "Welcome back" : "Workspace request received"}, {submitted}.
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-700">
            {isSignIn
              ? "You can continue into the EMP workspace from here."
              : "Your workspace request has been received. The EMP team can now review onboarding fit and follow up with the right next step."}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => setSubmitted(null)}
              type="button"
            >
              {isSignIn ? "Sign in again" : "Submit another request"}
            </button>
            <Link
              className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
              href="/product"
            >
              Explore product
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
                  isSignIn
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-950 hover:text-slate-950"
                }`}
                href="/sign-in"
              >
                Sign in
              </Link>
              <Link
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${
                  isSignIn
                    ? "border-slate-200 bg-white text-slate-600 hover:border-slate-950 hover:text-slate-950"
                    : "border-slate-950 bg-slate-950 text-white"
                }`}
                href="/sign-up"
              >
                Request access
              </Link>
            </div>

            <div>
              <p className="eyebrow">{isSignIn ? "Access EMP" : "Create workspace access"}</p>
              <h2 className="mt-4 text-[1.9rem] font-semibold tracking-tight text-slate-950">
                {isSignIn ? "Sign in to your EMP workspace." : "Start a guided EMP workspace setup."}
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-600">
                {isSignIn
                  ? "Use your work credentials to access the EMP workspace."
                  : "Request account access to begin a guided EMP workspace setup."}
              </p>
            </div>
          </div>

          <form
            action={isSignIn ? actionUrl : undefined}
            className="grid gap-5"
            method={isSignIn ? "post" : undefined}
            onSubmit={
              isSignIn
                ? undefined
                : async (event) => {
                    event.preventDefault();
                    setError(null);

                    const formData = new FormData(event.currentTarget);
                    const name = String(formData.get("fullName") ?? "").trim();

                    try {
                      setIsPending(true);

                      const response = await fetch("/api/contact", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                          kind: "workspace_request",
                          name,
                          email: String(formData.get("email") ?? "").trim(),
                          company: String(formData.get("company") ?? "").trim(),
                          message: String(formData.get("message") ?? "").trim(),
                          sourcePath: String(formData.get("sourcePath") ?? pathname ?? "/"),
                          website: String(formData.get("website") ?? "").trim()
                        })
                      });

                      const result = (await response.json().catch(() => null)) as
                        | { ok?: boolean; error?: string }
                        | null;

                      if (!response.ok || !result?.ok) {
                        throw new Error(result?.error || "Unable to request workspace access right now");
                      }

                      setSubmitted(name || "there");
                      event.currentTarget.reset();
                    } catch (submitError) {
                      setError(
                        submitError instanceof Error
                          ? submitError.message
                          : "Unable to request workspace access right now"
                      );
                    } finally {
                      setIsPending(false);
                    }
                  }
            }
          >
            {isSignIn ? <input type="hidden" name="next" value={nextPath} /> : null}
            {isSignIn && returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            {!isSignIn ? <input type="hidden" name="sourcePath" value={pathname ?? "/"} /> : null}
            {!isSignIn ? <input autoComplete="off" className="hidden" name="website" tabIndex={-1} type="text" /> : null}
            {!isSignIn ? (
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Full name</span>
                <input
                  autoComplete="name"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                  name="fullName"
                  placeholder="Aisha Khan"
                  required
                  type="text"
                />
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Work email</span>
              <input
                autoComplete="email"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                name="email"
                placeholder="aisha@company.com"
                required
                type="email"
              />
            </label>

            {!isSignIn ? (
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Company</span>
                <input
                  autoComplete="organization"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                  name="company"
                  placeholder="Northstar Group"
                  required
                  type="text"
                />
              </label>
            ) : null}

            {isSignIn ? (
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Password</span>
                <input
                  autoComplete="current-password"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                  name="password"
                  placeholder="Enter your password"
                  required
                  type="password"
                />
              </label>
            ) : (
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">What do you need help setting up? (optional)</span>
                <textarea
                  className="min-h-28 resize-y rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                  name="message"
                  placeholder="We are setting up a new team and want guided onboarding for attendance, leave, and approvals."
                />
              </label>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 text-slate-600">
                <input className="h-4 w-4 rounded border-slate-300 text-slate-950" type="checkbox" />
                {isSignIn ? "Keep me signed in on this device" : "Send EMP product updates and rollout guidance"}
              </label>
              {isSignIn ? (
                <span className="text-slate-500">Secure workspace access</span>
              ) : (
                <span className="text-slate-500">Guided workspace setup</span>
              )}
            </div>

            {initialNotice && !submitted ? (
              <div
                aria-live="polite"
                className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                role="status"
              >
                {initialNotice}
              </div>
            ) : null}

            {error ? (
              <div
                aria-live="polite"
                className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="status"
              >
                {error}
              </div>
            ) : null}

            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={isPending}
              type="submit"
            >
              {isSignIn ? "Sign in" : isPending ? "Sending..." : "Request access"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
