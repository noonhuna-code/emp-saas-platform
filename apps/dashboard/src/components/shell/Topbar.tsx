"use client";

import Link from "next/link";
import { Bell, CircleHelp, Command, Search, Sparkles } from "lucide-react";
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
      return "Employee Management";
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
  const subscription = billingContext?.subscription ?? null;
  const seatSummary = billingContext?.seatSummary ?? null;
  const identityLabel = fullName ?? email ?? "Authenticated user";
  const seatLimitText =
    seatSummary?.seatLimit !== null && seatSummary?.seatLimit !== undefined
      ? `${seatSummary.activeBillable}/${seatSummary.seatLimit}`
      : `${seatSummary?.activeBillable ?? 0}`;

  const renewalLabel = (() => {
    if (!subscription) return null;
    const periodEnd = new Date(subscription.currentPeriodEnd);
    if (!Number.isFinite(periodEnd.getTime())) return null;
    return `Renews ${periodEnd.toLocaleDateString()}`;
  })();

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
    <img src={avatarUrl} alt="Profile" width={44} height={44} className="topbar-profile__avatar topbar-profile__avatar--xl" />
  ) : (
    <span className="topbar-profile__avatar-fallback topbar-profile__avatar--xl">{(identityLabel[0] ?? "U").toUpperCase()}</span>
  );

  return (
    <HeaderBar
      title={resolveHeaderTitle(persona)}
      subtitle={isEmployeePersona ? (lastLoginText ?? "Last login unavailable") : (lastLoginText ?? `${resolveWorkspaceLabel(persona)} workspace`)}
      leading={leadingAvatar}
      compact={isEmployeePersona}
      onToggleSidebar={onToggleSidebar}
      onToggleMobileSidebar={onToggleMobileSidebar}
      actions={(
        <>
          <StatusChip label={`${resolveWorkspaceLabel(persona)} workspace`} tone="info" compact />
          {shiftText ? <StatusChip label={`Shift ${shiftText}`} compact /> : null}
          {isEmployeePersona && employeeIdentity ? <StatusChip label={`ID ${employeeIdentity}`} compact tone="info" /> : null}
          {persona === "finance" && subscription ? <StatusChip label={`Plan ${subscription.planName}`} compact tone="info" /> : null}
          {!isEmployeePersona && persona !== "finance" && subscription ? <StatusChip label={`${subscription.planName} - ${subscription.status}`} compact /> : null}
          {!isEmployeePersona && renewalLabel ? <StatusChip label={renewalLabel} tone="info" compact /> : null}
          {!isEmployeePersona && seatSummary ? <StatusChip label={`Seats ${seatLimitText}`} compact /> : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="topbar-command"
            onClick={() => window.dispatchEvent(new CustomEvent("emp.commandPalette.toggle"))}
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <span className="topbar-command__kbd"><Command className="h-3 w-3" />K</span>
          </Button>
          <Link href="/app/notifications" className="topbar-icon-btn" aria-label="Open notifications">
            <Bell className="h-4 w-4" />
          </Link>
          <Link href="/app/resources" className="topbar-icon-btn" aria-label="Open help and resources">
            <CircleHelp className="h-4 w-4" />
          </Link>
          <div className="topbar-workspace-badge">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{companyId ? "Tenant scoped" : "Workspace scoped"}</span>
          </div>
          <div className="topbar-profile" title={identityLabel}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Profile" width={28} height={28} className="topbar-profile__avatar" />
            ) : (
              <span className="topbar-profile__avatar-fallback">{(identityLabel[0] ?? "U").toUpperCase()}</span>
            )}
            <span className="topbar-profile__name">{fullName ?? email ?? "User"}</span>
          </div>
          {!isEmployeePersona ? <CompanyContextBadge companyId={companyId} role={role} /> : null}
          <ThemeToggle />
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="secondary-btn">
              Logout
            </button>
          </form>
        </>
      )}
    />
  );
};
