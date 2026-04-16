import Link from "next/link";
import { ArrowRight, BarChart3, Building2, Clock3, FolderKanban, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import { ProductCredit } from "@/components/shell/ProductCredit";
import { buildPublicWebsiteUrl } from "@/lib/site";

const highlights = [
  {
    title: "People and org control",
    description: "Keep reporting lines, employee records, company structure, and directory visibility in one place.",
    icon: Users2
  },
  {
    title: "Leave, attendance, and time",
    description: "Run leave approvals, attendance reviews, shift coordination, and overtime workflows from one workspace.",
    icon: Clock3
  },
  {
    title: "Security and auditability",
    description: "Track login risk, session posture, monitoring signals, and operational audit events with role-aware access.",
    icon: ShieldCheck
  },
  {
    title: "Projects and execution",
    description: "Coordinate work, tasks, notes, and operational delivery without jumping across disconnected tools.",
    icon: FolderKanban
  }
] as const;

const metrics = [
  { label: "Unified workspace", value: "One product entry", meta: "Public website and protected workspace stay aligned" },
  { label: "Operations coverage", value: "HR + Admin + Ops", meta: "Built for enterprise workforce workflows" },
  { label: "Dashboard routing", value: "/app/*", meta: "Protected product area stays isolated" }
] as const;

const modules = [
  "Employee records",
  "Org chart",
  "Leave approvals",
  "Attendance review",
  "Projects",
  "Payroll visibility",
  "Security monitoring",
  "Notifications"
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(30,98,255,0.14),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_24%),linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.98))] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,rgba(30,98,255,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_24%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.98))] dark:text-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 rounded-[24px] border border-white/70 bg-white/72 px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/62 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,#0f172a,#1e62ff)] text-sm font-bold tracking-[0.22em] text-white shadow-[0_14px_28px_rgba(30,98,255,0.22)]">
                EMP
              </div>
              <div>
                <p className="text-sm font-semibold tracking-[-0.03em] text-slate-950 dark:text-slate-50">EMP SaaS Platform</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Workforce operations website and product entry</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/platform"
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
              >
                Platform View
              </Link>
              <Link
                href={buildPublicWebsiteUrl("/sign-in")}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:py-12">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Sparkles className="h-3.5 w-3.5" />
                Public Website
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Building2 className="h-3.5 w-3.5" />
                Workforce OS
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.07em] text-slate-950 dark:text-slate-50 sm:text-5xl lg:text-6xl">
                Employee operations, approvals, and company control in one calmer platform.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-600 dark:text-slate-300 sm:text-lg">
                EMP is designed for teams that want one operating surface for employee records, hierarchy, attendance, leave, payroll visibility,
                monitoring, and day-to-day execution without splitting work across disconnected systems.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={buildPublicWebsiteUrl("/sign-in")}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f172a,#1e62ff)] px-6 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(30,98,255,0.22)] transition hover:translate-y-[-1px]"
              >
                Enter Workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
              >
                Explore Platform
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] dark:border-slate-800/80 dark:bg-slate-950/68"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{metric.label}</p>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">{metric.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{metric.meta}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_54px_rgba(15,23,42,0.08)] dark:border-slate-800/80 dark:bg-slate-950/70 sm:p-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Platform Snapshot</p>
            </div>

            <div className="mt-5 grid gap-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800/80 dark:bg-slate-900/72"
                  >
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(30,98,255,0.16),rgba(16,185,129,0.16))] text-slate-900 dark:text-slate-50">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-[-0.04em] text-slate-950 dark:text-slate-50">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.description}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
          <article className="rounded-[28px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.06)] dark:border-slate-800/80 dark:bg-slate-950/68 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Coverage</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-slate-50">
              Built around the daily modules that workforce teams actually use.
            </h2>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {modules.map((module) => (
                <span
                  key={module}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {module}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,98,255,0.9))] p-5 text-white shadow-[0_24px_54px_rgba(15,23,42,0.18)] sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100/80">Access</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em]">Ready to enter the EMP workspace?</h2>
            <p className="mt-3 text-sm leading-7 text-blue-50/88">
              Use the sign-in flow for the live product surface, or browse the platform overview first if you want a calmer product tour before logging in.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={buildPublicWebsiteUrl("/sign-in")}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Sign In
              </Link>
              <Link
                href="/app/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/8"
              >
                Open App
              </Link>
            </div>
          </article>
        </section>

        <div className="pt-6">
          <ProductCredit />
        </div>
      </div>
    </main>
  );
}
