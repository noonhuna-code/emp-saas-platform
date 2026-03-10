"use client";

import Link from "next/link";
import { Bell, CircleHelp, Command, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeaderBar } from "@/components/layout/HeaderBar";
import { CompanyContextBadge } from "./CompanyContextBadge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { StatusChip } from "@/components/ui/StatusChip";
import type { BillingNavigationContext } from "@/lib/types/billing";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";

const resolveHeaderTitle = (persona: DashboardPersona): string => {
  switch (persona) {
    case "employee":
      return "Employee Workspace";
    case "team_lead":
      return "Team Lead Workspace";
    case "manager":
      return "Manager Workspace";
    case "hr":
      return "HR Workspace";
    case "it":
      return "IT Workspace";
    case "admin":
      return "Admin Operations";
    case "founder":
      return "Founder Dashboard";
    case "finance":
      return "Finance Operations";
    case "platform_owner":
      return "Platform Operations";
    default:
      return "Dashboard";
  }
};

const resolveWorkspaceLabel = (persona: DashboardPersona): string =>
  persona
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

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
  const isEmployeePersona = persona === "employee";
  const seatSummary = billingContext?.seatSummary ?? null;
  const identityLabel = fullName ?? email ?? "Authenticated user";
  const headerTitle = isEmployeePersona ? (fullName ?? "Employee Workspace") : resolveHeaderTitle(persona);

  const lastLoginText = (() => {
    if (!lastLoginAt) return null;
    const value = new Date(lastLoginAt);
    if (!Number.isFinite(value.getTime())) return `Last login ${lastLoginAt}`;
    return `Last login ${value.toLocaleString()}`;
  })();

  const shiftText = (() => {
    if (!shiftStartTime || !shiftEndTime) return null;
    const hoursLabel = typeof shiftHours === "number" ? ` (${shiftHours}h)` : "";
    return `${shiftStartTime} - ${shiftEndTime}${hoursLabel}`;
  })();

  const employeeIdentity = employeeCode ?? (employeeId ? employeeId.slice(0, 8) : null);
  const leadingAvatar = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="Profile" width={56} height={56} className="topbar-profile__avatar topbar-profile__avatar--xl" />
  ) : (
    <span className="topbar-profile__avatar-fallback topbar-profile__avatar--xl">{(identityLabel[0] ?? "U").toUpperCase()}</span>
  );

  const leadingChips = (
    <div className="topbar-suite__meta-strip">
      {shiftText ? <StatusChip label={`Shift ${shiftText}`} compact /> : null}
      {employeeIdentity ? <StatusChip label={`ID ${employeeIdentity}`} compact tone="info" /> : null}
      {!isEmployeePersona && seatSummary ? <StatusChip label={`Seats ${seatSummary.activeBillable}/${seatSummary.seatLimit ?? "-"}`} compact /> : null}
      {!isEmployeePersona ? <StatusChip label={resolveWorkspaceLabel(persona)} compact tone="info" /> : null}
      {!isEmployeePersona ? <CompanyContextBadge companyId={companyId} role={role} /> : null}
    </div>
  );

  const actionBar = (
    <div className="topbar-suite topbar-suite--v11">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="topbar-command"
        onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4" />
        <span className="topbar-command__label">Search</span>
        <span className="topbar-command__kbd"><Command className="h-3 w-3" />K</span>
      </Button>

      {leadingChips}

      <div className="topbar-suite__action-strip">
        <Link href="/app/notifications" className="topbar-icon-btn" aria-label="Open notifications"><Bell className="h-4 w-4" /></Link>
        <Link href="/app/resources" className="topbar-icon-btn" aria-label="Open help and resources"><CircleHelp className="h-4 w-4" /></Link>
        <div className="topbar-workspace-badge">
          <span>{isEmployeePersona ? "Personal workspace" : "Operations workspace"}</span>
        </div>
        <ThemeToggle />
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="secondary-btn topbar-logout-btn">
            Logout
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <HeaderBar
      title={headerTitle}
      subtitle={lastLoginText ?? (isEmployeePersona ? "Personal workspace" : `${resolveWorkspaceLabel(persona)} workspace`)}
      leading={leadingAvatar}
      compact={isEmployeePersona}
      onToggleSidebar={onToggleSidebar}
      onToggleMobileSidebar={onToggleMobileSidebar}
      actions={actionBar}
    />
  );
};
