"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { Bell, CircleHelp, Command, LayoutPanelLeft, Menu, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { BillingNavigationContext } from "@/lib/types/billing";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import { TENANT_NAVIGATION_GROUPS, resolveVisibleNavigationGroups } from "@/navigation/navigation.config";

export const Topbar = ({
  persona,
  role,
  permissions = [],
  companyId,
  email,
  employeeId,
  employeeCode,
  fullName,
  avatarUrl,
  lastLoginAt,
  shiftStartTime,
  shiftEndTime,
  shiftHours,
  billingContext,
  onToggleSidebar,
  onToggleMobileSidebar,
}: {
  persona: DashboardPersona;
  role: string | null;
  permissions?: string[];
  companyId: string | null;
  email: string | null | undefined;
  employeeId?: string | null;
  employeeCode?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  shiftHours?: number | null;
  billingContext: BillingNavigationContext | null;
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
}) => {
  const pathname = usePathname();
  const identityLabel = fullName ?? email ?? "Authenticated user";
  const lastLoginText = (() => {
    if (!lastLoginAt) return "Active now";
    const value = new Date(lastLoginAt);
    if (!Number.isFinite(value.getTime())) return lastLoginAt;
    return value.toLocaleString();
  })();

  const shiftText =
    shiftStartTime && shiftEndTime
      ? `${shiftStartTime} - ${shiftEndTime}${typeof shiftHours === "number" ? ` (${shiftHours}h)` : ""}`
      : "No shift assigned";

  const idText = employeeCode ?? (employeeId ? employeeId.slice(0, 8) : null);
  const metaText =
    persona === "employee"
      ? "Personal workspace"
      : role ?? companyId?.slice(0, 8) ?? billingContext?.seatSummary?.activeBillable?.toString() ?? "Tenant workspace";

  const navigationContext = useMemo(() => {
    const visibleGroups = resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, {
      permissions,
      hasEmployeeContext: Boolean(employeeId),
      entitlements: billingContext?.entitlements ?? null,
      persona,
    });

    for (const group of visibleGroups) {
      const item = group.items.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
      if (item) {
        return {
          groupLabel: group.label,
          itemLabel: item.label,
          itemDescription: item.description ?? "Current workspace context",
        };
      }
    }

    return {
      groupLabel: "Workspace",
      itemLabel: "Current view",
      itemDescription: "Search people, workflows, and actions",
    };
  }, [billingContext?.entitlements, employeeId, pathname, permissions, persona]);

  const postureBadges = useMemo(() => {
    const badges = [
      {
        icon: ShieldCheck,
        label: companyId ? "Tenant scoped" : "No tenant scope",
      },
      {
        icon: Sparkles,
        label:
          persona === "employee"
            ? "Self-service ready"
            : persona === "platform_owner"
              ? "Platform oversight"
              : "Role-aware workspace",
      },
    ];

    if (idText) {
      badges.push({
        icon: Command,
        label: `ID ${idText}`,
      });
    }

    return badges;
  }, [companyId, idText, persona]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/88 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-[#020817]/88">
      <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 md:hidden"
                onClick={onToggleMobileSidebar}
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              {onToggleSidebar ? (
                <button
                  type="button"
                  className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 md:inline-flex"
                  onClick={onToggleSidebar}
                  aria-label="Toggle sidebar"
                >
                  <LayoutPanelLeft className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="min-w-0 flex-1 rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,248,255,0.94))] px-4 py-3 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.94))]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-blue-200/80 bg-blue-50/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
                  {navigationContext.groupLabel}
                </Badge>
                <Badge className="rounded-full border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  {navigationContext.itemLabel}
                </Badge>
              </div>
              <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{identityLabel}</div>
                  <div className="truncate text-sm text-slate-500 dark:text-slate-400">{navigationContext.itemDescription}</div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Last login {lastLoginText}</span>
                  <span className="hidden sm:inline">|</span>
                  <span>{metaText}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              className="flex h-12 w-full items-center justify-between gap-3 rounded-[22px] border border-slate-200 bg-white/92 px-4 text-left text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700"
              onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
              aria-label="Open command palette"
            >
              <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
                <Search className="h-4 w-4 shrink-0" />
                <span className="truncate">Search {navigationContext.itemLabel.toLowerCase()}, people, workflows, and docs</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Command className="h-3 w-3" />K
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full border-slate-200 bg-white/88 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
              {shiftText}
            </Badge>
            {postureBadges.map((badge) => {
              const Icon = badge.icon;
              return (
                <Badge
                  key={badge.label}
                  className="rounded-full border-slate-200 bg-white/88 px-3 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300"
                >
                  <Icon className="mr-1.5 h-3.5 w-3.5" />
                  {badge.label}
                </Badge>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/app/notifications"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
              aria-label="Help and commands"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            <ThemeToggle />
            <div className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 bg-white/92 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-sm font-semibold text-white">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  (identityLabel[0] ?? "U").toUpperCase()
                )}
              </div>
              <div className="hidden min-w-0 sm:block">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100">{identityLabel}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">{email ?? metaText}</div>
              </div>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-600 dark:hover:bg-slate-900"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
