"use client";

import Link from "next/link";
import { Bell, CircleHelp, Command, LayoutPanelLeft, Menu, Search } from "lucide-react";
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
    if (!lastLoginAt) return "Active now";
    const value = new Date(lastLoginAt);
    if (!Number.isFinite(value.getTime())) return lastLoginAt;
    return value.toLocaleString();
  })();

  const shiftText = (() => {
    if (!shiftStartTime || !shiftEndTime) return "No shift assigned";
    const hoursLabel = typeof shiftHours === "number" ? ` (${shiftHours}h)` : "";
    return `${shiftStartTime} - ${shiftEndTime}${hoursLabel}`;
  })();

  const identityCode = employeeCode ?? (employeeId ? employeeId.slice(0, 8) : null);
  const metaChip = !isEmployeePersona && role
    ? role
    : !isEmployeePersona && !role && companyId
      ? companyId.slice(0, 8)
      : !isEmployeePersona && seatSummary
        ? `Seats ${seatSummary.activeBillable}/${seatSummary.seatLimit ?? "-"}`
        : null;

  const avatarNode = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="Profile" width={44} height={44} className="control-topbar__avatar-image" />
  ) : (
    <span className="control-topbar__avatar-fallback">{(identityLabel[0] ?? "U").toUpperCase()}</span>
  );

  return (
    <header className="control-topbar">
      <div className="control-topbar__inner">
        <div className="control-topbar__left">
          <div className="control-topbar__toggles">
            <button
              type="button"
              className="control-topbar__icon md:hidden"
              onClick={onToggleMobileSidebar}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            {onToggleSidebar ? (
              <button
                type="button"
                className="control-topbar__icon hidden md:inline-flex"
                onClick={onToggleSidebar}
                aria-label="Toggle sidebar"
              >
                <LayoutPanelLeft className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="control-topbar__profile">
            {avatarNode}
            <div className="control-topbar__copy">
              <div className="control-topbar__title-row">
                <h1>{identityLabel}</h1>
                <span className="control-topbar__persona">{personaLabel}</span>
              </div>
              <p>Last login {lastLoginText}</p>
            </div>
          </div>
        </div>

        <div className="control-topbar__center">
          <button
            type="button"
            className="control-topbar__search"
            onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
            aria-label="Open command palette"
          >
            <span className="control-topbar__search-icon">
              <Search className="h-4 w-4" />
            </span>
            <span className="control-topbar__search-label">Search</span>
            <span className="control-topbar__search-kbd">
              <Command className="h-3 w-3" />K
            </span>
          </button>
        </div>

        <div className="control-topbar__right">
          <span className="control-topbar__chip">Shift {shiftText}</span>
          {identityCode ? <span className="control-topbar__chip control-topbar__chip--accent">ID {identityCode}</span> : null}
          {metaChip ? <span className="control-topbar__chip">{metaChip}</span> : null}
          <Link href="/app/notifications" className="control-topbar__icon" aria-label="Open notifications">
            <Bell className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="control-topbar__icon"
            onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
            aria-label="Open help and commands"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <ThemeToggle />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="control-topbar__logout">Logout</button>
          </form>
        </div>
      </div>
    </header>
  );
};
