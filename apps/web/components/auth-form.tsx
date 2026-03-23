"use client";

import Link from "next/link";
import { useState } from "react";

type AuthMode = "sign-in" | "sign-up";

type AuthFormProps = {
  mode: AuthMode;
  actionUrl?: string;
  nextPath?: string;
};

export function AuthForm({ mode, actionUrl, nextPath = "/app/dashboard" }: AuthFormProps) {
  const [submitted, setSubmitted] = useState<string | null>(null);
  const isSignIn = mode === "sign-in";

  return (
    <div className="surface rounded-[2rem] p-6 sm:p-8">
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
              : "Your workspace request has been received and the next onboarding step can be prepared."}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              className="inline-flex items-center rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => setSubmitted(null)}
              type="button"
            >
              {isSignIn ? "Sign in again" : "Create another account"}
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
          <div className="mb-6 space-y-5">
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
                Sign up
              </Link>
            </div>

            <div>
              <p className="eyebrow">{isSignIn ? "Access EMP" : "Create workspace access"}</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                {isSignIn ? "Sign in to your EMP workspace." : "Start a guided EMP workspace setup."}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
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
                : (event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    const name = String(
                      formData.get(isSignIn ? "email" : "fullName") ?? ""
                    ).trim();

                    setSubmitted(name || "there");

                    event.currentTarget.reset();
                  }
            }
          >
            {isSignIn ? <input type="hidden" name="next" value={nextPath} /> : null}
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

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-700">Password</span>
              <input
                autoComplete={isSignIn ? "current-password" : "new-password"}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-950"
                name="password"
                placeholder={isSignIn ? "Enter your password" : "Create a secure password"}
                required
                type="password"
              />
            </label>

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

            <button
              className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="submit"
            >
              {isSignIn ? "Sign in" : "Create account"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
