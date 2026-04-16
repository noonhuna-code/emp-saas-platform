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
import { buildPublicWebsiteUrl } from "@/lib/site";
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
      "flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 text-left text-gray-500 shadow-theme-xs transition hover:border-gray-300 hover:bg-white dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]",
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
  constrained = false,
}: {
  groupLabel: string;
  itemLabel: string;
  title: string;
  subtitle: string;
  compact?: boolean;
  constrained?: boolean;
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
          compact ? "text-[15px]" : constrained ? "text-[1rem] xl:text-[1.12rem]" : "text-[1.05rem] xl:text-[1.2rem]"
        )}
      >
        {title}
      </h1>
      <p
        className={cn(
          "max-w-2xl overflow-hidden text-ellipsis whitespace-nowrap text-[13px] leading-5 text-slate-500 dark:text-slate-400",
          compact ? "hidden" : constrained ? "hidden 2xl:block" : "hidden xl:block"
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
  compactTrigger = false,
}: {
  identityLabel: string;
  email: string | null | undefined;
  roleLabel: string;
  avatarUrl?: string | null;
  profileHref: string;
  homeHref: string;
  compactTrigger?: boolean;
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
        title={compactTrigger ? identityLabel : `${identityLabel} account`}
        className={cn(
          "flex h-11 min-w-0 items-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/25 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]",
          compactTrigger ? "min-w-[2.875rem] justify-center gap-1.5 px-1.5 pr-2" : "gap-2 px-2.5"
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-600 text-sm font-semibold text-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={identityLabel} className="h-full w-full object-cover" />
          ) : (
            (identityLabel[0] ?? "U").toUpperCase()
          )}
        </span>
        <span className={cn("min-w-0", compactTrigger ? "hidden" : "hidden xl:block")}>
          <span className="block max-w-[10rem] truncate text-sm font-semibold leading-4">{identityLabel}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")} />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[90] w-[19rem] rounded-2xl border border-gray-200 bg-white p-3 shadow-[0_20px_40px_rgba(16,24,40,0.14)] backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900"
              style={{ top: position.top, left: position.left }}
            >
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 dark:border-gray-800 dark:bg-gray-800/80">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-slate-50">{identityLabel}</div>
                <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{email ?? "No email available"}</div>
                <div className="mt-2 inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
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
                  <input type="hidden" name="returnTo" value={buildPublicWebsiteUrl("/sign-in")} />
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
        <div className="-mx-1 flex items-center overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex min-w-max items-center gap-1 rounded-[16px] border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/75">
            {tabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-[12px] px-3 py-1.5 text-sm font-medium transition",
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
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-end">
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
  sidebarCollapsed = false,
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
  sidebarCollapsed?: boolean;
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
      role,
      permissions,
      hasEmployeeContext: Boolean(employeeId),
      entitlements: billingContext?.entitlements ?? null,
      persona,
    };

    return resolveShellHeaderMeta(pathname, context);
  }, [billingContext?.entitlements, employeeId, navigationGroups, pathname, permissions, persona, role]);

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
    } else if (persona === "manager") {
      chips.push("Team operations");
    } else if (persona === "executive") {
      chips.push("Executive view");
    } else if (persona === "finance") {
      chips.push("Finance controls");
    } else if (persona === "admin_ops") {
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
  const compactDesktopProfileTrigger = !sidebarCollapsed;
  const sidebarExpanded = !sidebarCollapsed;

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-gray-50/95 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto w-full max-w-[1720px] px-4 py-3 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="px-3 py-3 sm:px-4">
            <div className="flex items-center justify-between gap-3 lg:hidden">
              <div className="flex min-w-0 items-center gap-2.5">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]"
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Link>
                <details className="relative">
                  <summary
                  title="More actions"
                    className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-[0_20px_40px_rgba(16,24,40,0.14)] dark:border-gray-800 dark:bg-gray-900">
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
                  compactTrigger={false}
                />
              </div>
            </div>

            <div className="mt-2 lg:hidden">
              <TopbarSearch placeholder={headerMeta.searchPlaceholder} />
            </div>

            <div
              className={cn(
                "hidden lg:grid lg:items-center lg:gap-3",
                sidebarExpanded
                  ? "lg:grid-cols-[minmax(160px,1fr)_minmax(170px,230px)_auto] xl:grid-cols-[minmax(210px,1fr)_minmax(210px,280px)_auto] 2xl:grid-cols-[minmax(250px,1fr)_minmax(250px,340px)_auto]"
                  : "lg:grid-cols-[minmax(220px,1fr)_minmax(220px,320px)_auto] xl:grid-cols-[minmax(260px,1fr)_minmax(240px,360px)_auto] 2xl:grid-cols-[minmax(300px,1fr)_minmax(280px,420px)_auto]"
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {onToggleSidebar ? (
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]"
                    onClick={onToggleSidebar}
                    aria-label="Toggle sidebar"
                    title="Toggle sidebar"
                  >
                    <LayoutPanelLeft className="h-4 w-4" />
                  </button>
                ) : null}
                <TopbarTitleBlock
                  groupLabel={headerMeta.groupLabel}
                  itemLabel={headerMeta.itemLabel}
                  title={headerMeta.title}
                  subtitle={headerMeta.subtitle}
                  constrained={sidebarExpanded}
                />
              </div>

              <TopbarSearch
                placeholder={headerMeta.searchPlaceholder}
                className={cn(
                  "justify-self-center",
                  sidebarExpanded
                    ? "max-w-[230px] xl:max-w-[280px] 2xl:max-w-[340px]"
                    : "max-w-[320px] xl:max-w-[360px] 2xl:max-w-[420px]"
                )}
              />

              <div className="flex items-center justify-end gap-1.5 xl:gap-2">
                <Link
                  href={notificationsHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </Link>
                <Link
                  href={helpHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-theme-xs transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]"
                  aria-label="Help and resources"
                  title="Help and resources"
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
                  compactTrigger={compactDesktopProfileTrigger}
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
