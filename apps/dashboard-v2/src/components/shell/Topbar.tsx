"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  LayoutPanelLeft,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  UserRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { cn } from "@/lib/utils";
import type { BillingNavigationContext } from "@/lib/types/billing";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";
import {
  type NavigationGroup,
  type NavigationVisibilityContext,
  resolveShellHeaderMeta,
} from "@/navigation/navigation.config";
import { getOrganizationCapabilities } from "@/components/organization/organization-access";

const formatRoleLabel = (role: string | null | undefined) => {
  if (!role) return "Workspace user";
  return role
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (value) => value.toUpperCase());
};

const resolvePlatformHeaderMeta = (
  pathname: string,
  navigationGroups: NavigationGroup[] | undefined
) => {
  const groups = navigationGroups ?? [];

  for (const group of groups) {
    const item = group.items.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
    if (item) {
      return {
        groupLabel: group.label,
        itemLabel: item.label,
        title: item.label,
        subtitle: item.description ?? "Cross-tenant oversight, governance, and platform-wide control.",
        searchPlaceholder: "Search platform controls, monitoring, billing, and settings",
        tabs: groups.flatMap((section) => section.items.map((entry) => ({ label: entry.label, href: entry.href }))),
      };
    }
  }

  return {
    groupLabel: "Platform",
    itemLabel: "Overview",
    title: "Platform oversight",
    subtitle: "Cross-tenant governance, billing posture, and system-wide health.",
    searchPlaceholder: "Search platform controls, monitoring, billing, and settings",
    tabs: groups.flatMap((section) => section.items.map((entry) => ({ label: entry.label, href: entry.href }))),
  };
};

const TopbarSearch = ({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) => (
  <button
    type="button"
    className={cn(
      "flex h-10 w-full items-center justify-between gap-3 rounded-[16px] border border-slate-200/85 bg-white/92 px-3.5 text-left text-slate-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/72 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900",
      className
    )}
    onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
    aria-label="Open command palette"
  >
    <span className="flex min-w-0 items-center gap-3 text-sm font-medium">
      <Search className="h-4 w-4 shrink-0" />
      <span className="truncate">{placeholder}</span>
    </span>
    <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:inline-flex">
      <Command className="h-3 w-3" />K
    </span>
  </button>
);

const TopbarTitleBlock = ({
  groupLabel,
  itemLabel,
  title,
  subtitle,
  compact = false,
}: {
  groupLabel: string;
  itemLabel: string;
  title: string;
  subtitle: string;
  compact?: boolean;
}) => (
  <div className="min-w-0">
    <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
      <span className="truncate">{groupLabel}</span>
      <ChevronRight className="h-3 w-3 shrink-0" />
      <span className="truncate">{itemLabel}</span>
    </div>
    <div className={cn("mt-1 space-y-0.5", compact && "mt-0.5")}>
      <h1
        className={cn(
          "truncate font-semibold tracking-[-0.04em] text-slate-950 dark:text-slate-50",
          compact ? "text-[15px]" : "text-[1.08rem] xl:text-[1.22rem]"
        )}
      >
        {title}
      </h1>
      <p
        className={cn(
          "max-w-2xl overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-5 text-slate-500 dark:text-slate-400",
          compact ? "hidden" : "hidden xl:block"
        )}
      >
        {subtitle}
      </p>
    </div>
  </div>
);

const TopbarProfileMenu = ({
  identityLabel,
  email,
  roleLabel,
  avatarUrl,
  profileHref,
  homeHref,
}: {
  identityLabel: string;
  email: string | null | undefined;
  roleLabel: string;
  avatarUrl?: string | null;
  profileHref: string;
  homeHref: string;
}) => {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const panelWidth = 304;
      const viewportWidth = window.innerWidth;
      const left = Math.max(12, Math.min(rect.right - panelWidth, viewportWidth - panelWidth - 12));
      const top = rect.bottom + 12;
      setPosition({ top, left });
    };

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 min-w-0 items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-2.5 text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/35 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-900"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-sm font-semibold text-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={identityLabel} className="h-full w-full object-cover" />
          ) : (
            (identityLabel[0] ?? "U").toUpperCase()
          )}
        </span>
        <span className="hidden min-w-0 xl:block">
          <span className="block max-w-[10rem] truncate text-sm font-semibold leading-4">{identityLabel}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[90] w-[19rem] rounded-[20px] border border-slate-200/90 bg-white/98 p-3 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/98"
              style={{ top: position.top, left: position.left }}
            >
              <div className="rounded-[16px] border border-slate-200/80 bg-slate-50/70 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{identityLabel}</div>
                <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{email ?? "No email available"}</div>
                <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {roleLabel}
                </div>
              </div>

              <div className="mt-3 grid gap-1">
                <Link
                  href={homeHref}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <LayoutPanelLeft className="h-4 w-4" />
                  Open dashboard
                </Link>
                <Link
                  href={profileHref}
                  className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                  onClick={() => setOpen(false)}
                >
                  <UserRound className="h-4 w-4" />
                  Open profile
                </Link>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

const TopbarContextRow = ({
  tabs,
  chips,
}: {
  tabs: Array<{ label: string; href: string }>;
  chips: string[];
}) => {
  const pathname = usePathname();

  return (
    <div className="border-t border-slate-200/70 px-3 py-2.5 dark:border-slate-800/80 sm:px-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex items-center overflow-x-auto px-1 pb-1">
          <div className="inline-flex min-w-max items-center gap-1 rounded-[16px] border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/75">
            {tabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "whitespace-nowrap rounded-[12px] px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-white text-slate-950 shadow-[0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-sky-500/15 dark:bg-slate-950 dark:text-slate-50 dark:ring-sky-400/20"
                      : "text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-950 dark:hover:text-slate-50"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 lg:justify-end">
          {chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50/85 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

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
  navigationGroups,
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
  navigationGroups?: NavigationGroup[];
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
}) => {
  const pathname = usePathname();
  const identityLabel = fullName ?? email ?? "Authenticated user";
  const roleLabel = formatRoleLabel(role ?? persona);

  const headerMeta = useMemo(() => {
    if (persona === "platform_owner") {
      return resolvePlatformHeaderMeta(pathname, navigationGroups);
    }

    const context: NavigationVisibilityContext = {
      permissions,
      hasEmployeeContext: Boolean(employeeId),
      entitlements: billingContext?.entitlements ?? null,
      persona,
    };

    return resolveShellHeaderMeta(pathname, context);
  }, [billingContext?.entitlements, employeeId, navigationGroups, pathname, permissions, persona]);

  const contextChips = useMemo(() => {
    const chips: string[] = [];

    if (persona === "platform_owner") {
      chips.push("Platform scope", "Global oversight");
    } else {
      chips.push(companyId ? "Tenant scoped" : "No tenant scope");
    }

    if (
      pathname === "/app/organization" ||
      pathname.startsWith("/app/organization/") ||
      pathname === "/app/people" ||
      pathname.startsWith("/app/people/") ||
      pathname === "/app/org-chart" ||
      pathname.startsWith("/app/org-chart/")
    ) {
      const orgCapabilities = getOrganizationCapabilities(role, permissions);
      chips.push(orgCapabilities.roleLabel);
      chips.push(orgCapabilities.isReadOnly ? "Read only" : "Admin capable");
    } else if (persona === "employee") {
      chips.push("Self service");
      if (employeeCode) chips.push(`ID ${employeeCode}`);
    } else if (persona === "manager" || persona === "team_lead") {
      chips.push("Team operations");
    } else if (persona === "founder") {
      chips.push("Executive view");
    } else if (persona === "finance") {
      chips.push("Finance controls");
    } else if (persona === "it") {
      chips.push("System visibility");
    } else if (persona === "hr" || persona === "admin") {
      chips.push("Operational control");
    }

    if (shiftStartTime && shiftEndTime && persona !== "platform_owner") {
      const shiftSummary = `${shiftStartTime}-${shiftEndTime}${typeof shiftHours === "number" ? ` - ${shiftHours}h` : ""}`;
      chips.push(`Shift ${shiftSummary}`);
    }

    if (lastLoginAt && persona === "platform_owner") {
      const loginDate = new Date(lastLoginAt);
      chips.push(`Seen ${Number.isFinite(loginDate.getTime()) ? loginDate.toLocaleDateString() : lastLoginAt}`);
    }

    return chips.slice(0, 3);
  }, [companyId, employeeCode, lastLoginAt, pathname, permissions, persona, role, shiftEndTime, shiftHours, shiftStartTime]);

  const profileHref = employeeId ? "/app/profile" : persona === "platform_owner" ? "/platform" : "/app/dashboard";
  const homeHref = persona === "platform_owner" ? "/platform" : "/app/dashboard";
  const notificationsHref = persona === "platform_owner" ? "/platform" : "/app/notifications";
  const helpHref = persona === "platform_owner" ? "/platform" : "/app/resources";
  const hasContextRow = headerMeta.tabs.length > 0 || contextChips.length > 0;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/75 bg-[linear-gradient(180deg,rgba(248,250,255,0.96),rgba(244,247,253,0.92))] backdrop-blur-xl dark:border-slate-800/80 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(8,15,28,0.86))]">
      <div className="mx-auto w-full max-w-[1720px] px-4 py-3 sm:px-6 lg:px-8">
        <div className="rounded-[20px] border border-slate-200/70 bg-white/82 shadow-[0_10px_28px_rgba(15,23,42,0.05)] dark:border-slate-800/70 dark:bg-slate-950/62">
          <div className="px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  onClick={onToggleMobileSidebar}
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <TopbarTitleBlock
                  groupLabel={headerMeta.groupLabel}
                  itemLabel={headerMeta.itemLabel}
                  title={headerMeta.title}
                  subtitle={headerMeta.subtitle}
                  compact
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Link
                  href={notificationsHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Link>
                <details className="relative">
                  <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900">
                    <MoreHorizontal className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-48 rounded-[20px] border border-slate-200/90 bg-white/96 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/96">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                      onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.open"))}
                    >
                      <Command className="h-4 w-4" />
                      Search
                    </button>
                    <Link
                      href={helpHref}
                      className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                    >
                      <CircleHelp className="h-4 w-4" />
                      Help
                    </Link>
                    <div className="px-3 py-2">
                      <ThemeToggle compact />
                    </div>
                  </div>
                </details>
                <TopbarProfileMenu
                  identityLabel={identityLabel}
                  email={email}
                  roleLabel={roleLabel}
                  avatarUrl={avatarUrl}
                  profileHref={profileHref}
                  homeHref={homeHref}
                />
              </div>
            </div>

            <div className="mt-2 lg:hidden">
              <TopbarSearch placeholder={headerMeta.searchPlaceholder} />
            </div>

            <div className="hidden lg:flex lg:flex-col lg:gap-3 xl:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2.5">
                  {onToggleSidebar ? (
                    <button
                      type="button"
                      className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                      onClick={onToggleSidebar}
                      aria-label="Toggle sidebar"
                    >
                      <LayoutPanelLeft className="h-4 w-4" />
                    </button>
                  ) : null}
                  <TopbarTitleBlock
                    groupLabel={headerMeta.groupLabel}
                    itemLabel={headerMeta.itemLabel}
                    title={headerMeta.title}
                    subtitle={headerMeta.subtitle}
                  />
                </div>

                <div className="flex shrink-0 items-center justify-end gap-1.5">
                  <Link
                    href={notificationsHref}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                  </Link>
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.open"))}
                    aria-label="Open command palette"
                  >
                    <Command className="h-4 w-4" />
                  </button>
                  <Link
                    href={helpHref}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    aria-label="Help and resources"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </Link>
                  <ThemeToggle compact />
                  <TopbarProfileMenu
                    identityLabel={identityLabel}
                    email={email}
                    roleLabel={roleLabel}
                    avatarUrl={avatarUrl}
                    profileHref={profileHref}
                    homeHref={homeHref}
                  />
                </div>
              </div>

              <TopbarSearch placeholder={headerMeta.searchPlaceholder} className="max-w-none" />
            </div>

            <div className="hidden xl:grid xl:grid-cols-[minmax(340px,1fr)_minmax(200px,320px)_auto] xl:items-center xl:gap-3 2xl:grid-cols-[minmax(360px,1fr)_minmax(240px,380px)_auto]">
              <div className="flex min-w-0 items-center gap-2.5">
                {onToggleSidebar ? (
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                    onClick={onToggleSidebar}
                    aria-label="Toggle sidebar"
                  >
                    <LayoutPanelLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <TopbarTitleBlock
                  groupLabel={headerMeta.groupLabel}
                  itemLabel={headerMeta.itemLabel}
                  title={headerMeta.title}
                  subtitle={headerMeta.subtitle}
                />
              </div>

              <TopbarSearch placeholder={headerMeta.searchPlaceholder} className="justify-self-end" />

              <div className="flex items-center justify-end gap-1.5 xl:gap-2">
                <Link
                  href={notificationsHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  className="hidden h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 xl:inline-flex"
                  onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.open"))}
                  aria-label="Open command palette"
                >
                  <Command className="h-4 w-4" />
                </button>
                <Link
                  href={helpHref}
                  className="hidden h-10 w-10 items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 xl:inline-flex"
                  aria-label="Help and resources"
                >
                  <CircleHelp className="h-4 w-4" />
                </Link>
                <ThemeToggle compact />
                <details className="relative xl:hidden">
                  <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[16px] border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900">
                    <MoreHorizontal className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-44 rounded-[20px] border border-slate-200/90 bg-white/96 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/96">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                      onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.open"))}
                    >
                      <Command className="h-4 w-4" />
                      Search
                    </button>
                    <Link
                      href={helpHref}
                      className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                    >
                      <CircleHelp className="h-4 w-4" />
                      Help
                    </Link>
                  </div>
                </details>
                <TopbarProfileMenu
                  identityLabel={identityLabel}
                  email={email}
                  roleLabel={roleLabel}
                  avatarUrl={avatarUrl}
                  profileHref={profileHref}
                  homeHref={homeHref}
                />
              </div>
            </div>
          </div>

          {hasContextRow ? <TopbarContextRow tabs={headerMeta.tabs} chips={contextChips} /> : null}
        </div>
      </div>
    </header>
  );
};
