import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthForm } from "@/components/auth-form";

type AuthShellProps = {
  mode: "sign-in" | "sign-up";
  eyebrow: string;
  title: ReactNode;
  description: string;
  bullets: string[];
  formAction?: string;
  nextPath?: string;
  showForm?: boolean;
};

export function AuthShell({
  mode,
  eyebrow,
  title,
  description,
  bullets,
  formAction,
  nextPath,
  showForm = true
}: AuthShellProps) {
  return (
    <section className={showForm ? "relative overflow-hidden py-6 sm:py-8 lg:py-10" : "section-tight pt-2"}>
      {showForm ? <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_58%)]" /> : null}
      <div className="container">
        <div className={showForm ? "grid gap-7 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start xl:gap-10" : "max-w-3xl"}>
          <div className="space-y-5 lg:max-w-lg">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl lg:text-[3rem] lg:leading-[1.05]">
                {title}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{description}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {bullets.map((bullet) => (
                <div key={bullet} className="rounded-[1.2rem] border border-slate-200 bg-white/88 px-4 py-3 text-sm font-medium text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                  {bullet}
                </div>
              ))}
            </div>

            <div className="surface overflow-hidden rounded-[1.8rem] p-3">
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-white/94 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Live product preview</p>
                <p className="mt-1 text-sm text-slate-600">The same workspace users land in after sign in.</p>
              </div>
              <div className="mt-3 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white p-2">
                <Image
                  alt="Real EMP dashboard workspace preview."
                  className="h-auto w-full rounded-[1rem]"
                  height={1000}
                  priority={mode === "sign-in"}
                  quality={92}
                  sizes="(min-width: 1024px) 640px, 100vw"
                  src="/screenshots/homepage-hero-visual.jpg"
                  width={1600}
                />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {[
                  "Real approvals, payroll, and people workflows",
                  "One sign-in path for employee, manager, HR, and admin roles",
                  "Role-aware routing after authentication"
                ].map((item) => (
                  <div key={item} className="rounded-[1.15rem] border border-slate-200/80 bg-white/88 px-4 py-3 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-700">
                <Link className="underline decoration-slate-300 underline-offset-4 hover:text-slate-950" href="/security">
                  Review security
                </Link>
                <Link className="underline decoration-slate-300 underline-offset-4 hover:text-slate-950" href="/product">
                  Review product
                </Link>
                <Link className="underline decoration-slate-300 underline-offset-4 hover:text-slate-950" href="/demo">
                  Book demo
                </Link>
              </div>
            </div>

            {!showForm ? (
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
            ) : null}
          </div>

          {showForm ? <div className="lg:sticky lg:top-20"><AuthForm mode={mode} actionUrl={formAction} nextPath={nextPath} /></div> : null}
        </div>
      </div>
    </section>
  );
}
