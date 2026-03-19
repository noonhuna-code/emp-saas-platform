import type { ReactNode } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
  eyebrow: string;
  title: ReactNode;
  description: string;
  bullets: string[];
};

export function AuthShell({
  mode,
  eyebrow,
  title,
  description,
  bullets
}: AuthShellProps) {
  return (
    <section className="section pt-6">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="space-y-6">
            <div className="max-w-xl">
              <p className="eyebrow">{eyebrow}</p>
              <h2 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                {title}
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">{description}</p>
            </div>

            <div className="rounded-[2rem] border border-slate-900/10 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
              <p className="eyebrow !border-white/15 !bg-white/8 !text-slate-200">Built for company access</p>
              <div className="mt-5 grid gap-3">
                {bullets.map((bullet) => (
                  <div key={bullet} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                    {bullet}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <h3 className="text-xl font-semibold text-slate-950">Built for company access</h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                EMP access can support invites, guided onboarding, and company-specific entry
                points while keeping the experience consistent with the main product.
              </p>
              <div className="mt-5 flex flex-wrap gap-4">
                <Link className="text-sm font-semibold text-slate-950 underline" href="/security">
                  Review security
                </Link>
                <Link className="text-sm font-semibold text-slate-950 underline" href="/contact">
                  Book a rollout demo
                </Link>
              </div>
            </div>
          </div>

          <AuthForm mode={mode} />
        </div>
      </div>
    </section>
  );
}
