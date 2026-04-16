"use client";

import Link from "next/link";
import { Suspense, lazy, useMemo } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  Layers3,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { DashboardRoleFallback } from "@/components/dashboard/DashboardRoleFallback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups } from "@/navigation/navigation.config";
import { resolveDashboardCapabilities, resolveDashboardPersona } from "@/lib/dashboard/capabilities";

type DashboardPageClientProps = {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
};

const EmployeeDashboard = lazy(() =>
  import("@/components/dashboard/EmployeeDashboard").then((module) => ({ default: module.EmployeeDashboard }))
);
const ManagerDashboard = lazy(() =>
  import("@/components/dashboard/ManagerDashboard").then((module) => ({ default: module.ManagerDashboard }))
);
const TeamLeadDashboard = lazy(() =>
  import("@/components/dashboard/TeamLeadDashboard").then((module) => ({ default: module.TeamLeadDashboard }))
);
const AdminDashboard = lazy(() =>
  import("@/components/dashboard/AdminDashboard").then((module) => ({ default: module.AdminDashboard }))
);
const FounderDashboard = lazy(() =>
  import("@/components/dashboard/FounderDashboard").then((module) => ({ default: module.FounderDashboard }))
);
const FinanceDashboard = lazy(() =>
  import("@/components/dashboard/FinanceDashboard").then((module) => ({ default: module.FinanceDashboard }))
);

const normalizeRole = (value: string | null) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, "_")
    .replace(/\s+/g, "_");

const PERSONA_COPY = {
  employee: {
    eyebrow: "Employee workspace",
    title: "Your EMP command center",
    subtitle: "Use one calmer workspace for self-service activity, personal records, notifications, and daily workflow context."
  },
  manager: {
    eyebrow: "Manager dashboard",
    title: "Team visibility and approvals in one flow",
    subtitle: "Move across attendance, leave, team coordination, and follow-up work without leaving the dashboard shell."
  },
  admin_ops: {
    eyebrow: "Operations workspace",
    title: "Operational control with clearer routing",
    subtitle: "Keep approvals, workforce controls, and admin actions in a layout built for volume, auditability, and speed."
  },
  finance: {
    eyebrow: "Finance workspace",
    title: "Payroll and billing oversight in one command layer",
    subtitle: "Review payroll visibility, billing posture, and controlled finance actions from one internal dashboard."
  },
  executive: {
    eyebrow: "Executive workspace",
    title: "Leadership oversight without operational noise",
    subtitle: "Track company posture, workforce health, monitoring, and enterprise workflows from one controlled executive surface."
  },
  platform_owner: {
    eyebrow: "Platform oversight",
    title: "Platform command center",
    subtitle: "Cross-tenant governance, monitoring posture, and control-plane operations."
  }
} as const;

export const DashboardPageClient = ({ role, permissions, hasEmployeeContext, entitlements }: DashboardPageClientProps) => {
  const persona = resolveDashboardPersona({ role, permissions });
  const personaCopy = PERSONA_COPY[persona];
  const caps = resolveDashboardCapabilities({ role, permissions });
  const normalizedRole = normalizeRole(role);
  const isTeamLeadRole =
    normalizedRole === "team_lead"
    || normalizedRole === "teamlead"
    || (permissions.includes("manage_attendance") && !permissions.includes("manage_employees"));
  const visibleGroups = useMemo(
    () =>
      resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, {
        permissions,
        hasEmployeeContext,
        entitlements,
        persona,
      }),
    [entitlements, hasEmployeeContext, permissions, persona]
  );
  const allowedRoutes = useMemo(
    () => {
      const routes = new Set(visibleGroups.flatMap((group) => group.items.map((item) => item.href)));

      if (hasEmployeeContext) {
        routes.add("/app/attendance/shift-swaps");
      }

      if (permissions.includes("manage_attendance")) {
        routes.add("/app/attendance/team");
        routes.add("/app/attendance/shift-swaps");
        routes.add("/app/leave/review");
      }

      if (permissions.includes("manage_employees")) {
        routes.add("/app/leave/review");
      }

      return [...routes];
    },
    [hasEmployeeContext, permissions, visibleGroups]
  );
  const adminOpsMode = useMemo(() => {
    if (
      normalizedRole === "it"
      || normalizedRole === "it_manager"
      || normalizedRole === "it_admin"
      || normalizedRole === "it_support"
      || (caps.has("view_it_dashboard") && !caps.has("view_admin_dashboard") && !caps.has("view_hr_dashboard"))
    ) {
      return "it" as const;
    }

    if (normalizedRole === "hr" || (caps.has("view_hr_dashboard") && !caps.has("view_admin_dashboard"))) {
      return "hr" as const;
    }

    return "admin" as const;
  }, [caps, normalizedRole]);
  const canViewTeamAttendance = permissions.includes("manage_attendance") && allowedRoutes.includes("/app/attendance");
  const canReviewLeave =
    (permissions.includes("manage_employees") || permissions.includes("manage_attendance"))
    && allowedRoutes.includes("/app/leave/review");
  const quickLinks = useMemo(
    () =>
      visibleGroups
        .flatMap((group) =>
          group.items.map((item) => ({
            href: item.href,
            label: item.label,
            description: item.description ?? `${group.label} workspace`,
            groupLabel: group.label
          }))
        )
        .slice(0, 6),
    [visibleGroups]
  );
  const groupHighlights = useMemo(
    () =>
      visibleGroups.slice(0, 4).map((group) => ({
        label: group.label,
        description: group.description ?? "Role-aware workspace section",
        count: group.items.length,
        routes: group.items.slice(0, 3),
        href: group.items[0]?.href ?? "/app/dashboard",
      })),
    [visibleGroups]
  );
  const overviewStats = useMemo(
    () => [
      {
        label: "Navigation groups",
        value: String(visibleGroups.length).padStart(2, "0"),
        hint: "Role-aware sections visible right now",
        icon: LayoutGrid
      },
      {
        label: "Accessible routes",
        value: String(allowedRoutes.length).padStart(2, "0"),
        hint: "Live routes currently enabled in this session",
        icon: BriefcaseBusiness
      },
      {
        label: "Session permissions",
        value: String(permissions.length).padStart(2, "0"),
        hint: "Capabilities driving the EMP workspace",
        icon: ShieldCheck
      }
    ],
    [allowedRoutes.length, permissions.length, visibleGroups.length]
  );
  const operationalSignals = useMemo(
    () => [
      {
        label: "Persona mode",
        value: personaCopy.eyebrow,
      },
      {
        label: "Employee context",
        value: hasEmployeeContext ? "Connected" : "Role-only",
      },
      {
        label: "Review surfaces",
        value: canReviewLeave ? "Leave review enabled" : "Standard routing",
      }
    ],
    [canReviewLeave, hasEmployeeContext, personaCopy.eyebrow]
  );

  const roleDashboard = useMemo(() => {
    switch (persona) {
      case "executive":
        return <FounderDashboard allowedRoutes={allowedRoutes} />;
      case "admin_ops":
        return <AdminDashboard mode={adminOpsMode} allowedRoutes={allowedRoutes} canReviewLeave={canReviewLeave} />;
      case "finance":
        return <FinanceDashboard allowedRoutes={allowedRoutes} />;
      case "manager":
        return isTeamLeadRole
          ? <TeamLeadDashboard allowedRoutes={allowedRoutes} canViewTeamAttendance={canViewTeamAttendance} canReviewLeave={canReviewLeave} />
          : <ManagerDashboard allowedRoutes={allowedRoutes} canViewTeamAttendance={canViewTeamAttendance} canReviewLeave={canReviewLeave} />;
      case "employee":
      default:
        return hasEmployeeContext
          ? <EmployeeDashboard allowedRoutes={allowedRoutes} />
          : <ManagerDashboard allowedRoutes={allowedRoutes} canViewTeamAttendance={canViewTeamAttendance} canReviewLeave={canReviewLeave} />;
    }
  }, [adminOpsMode, allowedRoutes, canReviewLeave, canViewTeamAttendance, hasEmployeeContext, isTeamLeadRole, persona]);

  if (persona === "platform_owner") {
    return (
      <div className="space-y-6">
        <Card className="rounded-3xl border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <CardHeader>
            <CardTitle>Platform oversight lives in the isolated platform shell</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600 dark:text-slate-400">
            <p>Use the dedicated platform workspace for cross-tenant governance, security, and subscription operations.</p>
            <Link href="/platform" className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900">
              Open platform shell
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid gap-6 px-5 py-5 md:px-6 md:py-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="min-w-0">
            <div className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {personaCopy.eyebrow}
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <h2 className="max-w-4xl text-3xl font-semibold tracking-[-0.04em] text-gray-900 dark:text-white/90 xl:text-[2.4rem]">
                  {personaCopy.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-500 dark:text-gray-400 sm:text-base">
                  {personaCopy.subtitle}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {overviewStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <article
                      key={stat.label}
                      className="rounded-2xl border border-gray-200 bg-gray-50/90 p-4 dark:border-gray-800 dark:bg-white/[0.03]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-gray-800 shadow-theme-xs dark:bg-gray-800 dark:text-white/90">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-gray-900 dark:text-white/90">
                        {stat.value}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                        {stat.hint}
                      </p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/90 p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white/90">Session signals</p>
              </div>
              <div className="mt-4 space-y-3">
                {operationalSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <p className="text-sm text-gray-500 dark:text-gray-400">{signal.label}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{signal.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-brand-500 dark:text-brand-400" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white/90">Quick access</p>
              </div>
              <div className="mt-4 space-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex items-start justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/60 dark:border-gray-800 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{link.label}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{link.description}</p>
                    </div>
                    <div className="flex flex-none items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-gray-400 transition group-hover:text-brand-500 dark:group-hover:text-brand-400">
                      {link.groupLabel}
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>

              <Link
                href={quickLinks[0]?.href ?? "/app/dashboard"}
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Continue in workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {groupHighlights.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {groupHighlights.map((group) => (
            <Link
              key={group.label}
              href={group.href}
              className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition hover:border-brand-200 hover:bg-brand-50/40 hover:shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:hover:border-brand-500/30 dark:hover:bg-brand-500/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-white/90">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{group.label}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{group.description}</p>
                  </div>
                </div>
                <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                  {String(group.count).padStart(2, "0")} routes
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {group.routes.map((route) => (
                  <span
                    key={route.href}
                    className="inline-flex rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                  >
                    {route.label}
                  </span>
                ))}
              </div>

              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition group-hover:text-brand-700 dark:text-brand-400 dark:group-hover:text-brand-300">
                Open section
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </section>
      ) : null}

      <Suspense fallback={<DashboardRoleFallback />}>{roleDashboard}</Suspense>
    </div>
  );
};
