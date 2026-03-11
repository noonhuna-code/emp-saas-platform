"use client";

import Link from "next/link";
import { Bell, CircleHelp, Command, LayoutPanelLeft, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { BillingNavigationContext } from "@/lib/types/billing";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";

const resolvePersonaLabel = (persona: DashboardPersona): string => {
  switch (persona) {
    case "employee":
      return "Employee";
    case "team_lead":
      return "Team Lead";
    case "manager":
      return "Manager";
    case "hr":
      return "HR";
    case "it":
      return "IT";
    case "admin":
      return "Admin";
    case "founder":
      return "Founder";
    case "finance":
      return "Finance";
    case "platform_owner":
      return "Platform";
    default:
      return "Workspace";
  }
};

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
  const personaLabel = resolvePersonaLabel(persona);
  const isEmployeePersona = persona === "employee";
  const seatSummary = billingContext?.seatSummary ?? null;

  const lastLoginText = (() => {
    if (!lastLoginAt) return "Active workspace";
    const value = new Date(lastLoginAt);
    if (!Number.isFinite(value.getTime())) return `Last login ${lastLoginAt}`;
    return `Last login ${value.toLocaleString()}`;
  })();

  const shiftText = (() => {
    if (!shiftStartTime || !shiftEndTime) return null;
    const hoursLabel = typeof shiftHours === "number" ? ` (${shiftHours}h)` : "";
    return `${shiftStartTime} - ${shiftEndTime}${hoursLabel}`;
  })();

  const identityCode = employeeCode ?? (employeeId ? employeeId.slice(0, 8) : null);

  const avatarNode = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="Profile" width={40} height={40} className="ui-topbar__avatar-image" />
  ) : (
    <span className="ui-topbar__avatar-fallback">{(identityLabel[0] ?? "U").toUpperCase()}</span>
  );

  return (
    <header className="ui-topbar">
      <div className="ui-topbar__surface">
        <div className="ui-topbar__left">
          <div className="ui-topbar__rail">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="ui-topbar__icon-btn md:hidden"
              onClick={onToggleMobileSidebar}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            {onToggleSidebar ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ui-topbar__icon-btn hidden md:inline-flex"
                onClick={onToggleSidebar}
                aria-label="Toggle sidebar"
              >
                <LayoutPanelLeft className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="ui-topbar__identity">
            <div className="ui-topbar__avatar">{avatarNode}</div>
            <div className="ui-topbar__copy">
              <h1>{identityLabel}</h1>
              <div className="ui-topbar__subline">
                <span className="ui-topbar__role">{personaLabel}</span>
                <span className="ui-topbar__sep">•</span>
                <span>{lastLoginText}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="ui-topbar__search"
          onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
          aria-label="Open command palette"
        >
          <span className="ui-topbar__search-copy">
            <Search className="h-4 w-4" />
            <span>Search</span>
          </span>
          <span className="ui-topbar__command-kbd">
            <Command className="h-3 w-3" />K
          </span>
        </button>

        <div className="ui-topbar__right">
          {shiftText ? <span className="ui-topbar__pill">Shift {shiftText}</span> : null}
          {identityCode ? <span className="ui-topbar__pill ui-topbar__pill--accent">ID {identityCode}</span> : null}
          {!isEmployeePersona && seatSummary ? (
            <span className="ui-topbar__pill">Seats {seatSummary.activeBillable}/{seatSummary.seatLimit ?? "-"}</span>
          ) : null}
          {!isEmployeePersona && role ? <span className="ui-topbar__pill">{role}</span> : null}
          {!isEmployeePersona && !role && companyId ? <span className="ui-topbar__pill">{companyId.slice(0, 8)}</span> : null}

          <Link href="/app/notifications" className="ui-topbar__icon-btn" aria-label="Open notifications">
            <Bell className="h-4 w-4" />
          </Link>
          <button type="button" className="ui-topbar__icon-btn" aria-label="Open help center">
            <CircleHelp className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="ui-topbar__logout">Logout</button>
          </form>
        </div>
      </div>
    </header>
  );
};
