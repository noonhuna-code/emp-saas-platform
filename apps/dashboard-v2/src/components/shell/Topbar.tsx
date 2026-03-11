"use client";

import Link from "next/link";
import { Bell, CircleHelp, Command, LayoutPanelLeft, Menu, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { BillingNavigationContext } from "@/lib/types/billing";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";

export const Topbar = ({
  persona,
  role,
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
  onToggleMobileSidebar
}: {
  persona: DashboardPersona;
  role: string | null;
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
  const identityLabel = fullName ?? email ?? "Authenticated user";
  const lastLoginText = (() => {
    if (!lastLoginAt) return "Active now";
    const value = new Date(lastLoginAt);
    if (!Number.isFinite(value.getTime())) return lastLoginAt;
    return value.toLocaleString();
  })();

  const shiftText = shiftStartTime && shiftEndTime
    ? `${shiftStartTime} - ${shiftEndTime}${typeof shiftHours === "number" ? ` (${shiftHours}h)` : ""}`
    : "No shift assigned";

  const idText = employeeCode ?? (employeeId ? employeeId.slice(0, 8) : null);
  const metaText = persona === "employee"
    ? "Personal workspace"
    : role ?? companyId?.slice(0, 8) ?? billingContext?.seatSummary?.activeBillable?.toString() ?? "Tenant workspace";

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/92 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#020817]/92">
      <div className="mx-auto flex w-full max-w-[1720px] items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
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

        <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-slate-200/80 bg-white/75 px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-base font-semibold text-white">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              (identityLabel[0] ?? "U").toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">{identityLabel}</div>
            <div className="truncate text-sm text-slate-500 dark:text-slate-400">Last login {lastLoginText}</div>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            className="flex h-12 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 text-left text-slate-500 transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:border-slate-700"
            onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
            aria-label="Open command palette"
          >
            <span className="flex items-center gap-3 text-sm font-medium">
              <Search className="h-4 w-4" />
              Search people, leave, payroll, and docs
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <Command className="h-3 w-3" />K
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="hidden rounded-full px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 xl:inline-flex">{shiftText}</Badge>
          {idText ? <Badge className="hidden rounded-full px-3 py-2 text-xs font-medium lg:inline-flex">ID {idText}</Badge> : null}
          <Badge className="hidden rounded-full px-3 py-2 text-xs font-medium 2xl:inline-flex">{metaText}</Badge>
          <Link href="/app/notifications" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900" aria-label="Notifications">
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
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="inline-flex h-11 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900">Logout</button>
          </form>
        </div>
      </div>
    </header>
  );
};

