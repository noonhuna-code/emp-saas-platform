import { HeaderBar } from "@/components/layout/HeaderBar";
import { CompanyContextBadge } from "./CompanyContextBadge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { StatusChip } from "@/components/ui/StatusChip";
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
    if (!Number.isFinite(value.getTime())) return null;
    return `Last login ${value.toLocaleString()}`;
  })();

  const shiftText = (() => {
    if (!shiftStartTime || !shiftEndTime) return null;
    const hoursLabel = typeof shiftHours === "number" ? ` (${shiftHours}h)` : "";
    return `${shiftStartTime} - ${shiftEndTime}${hoursLabel}`;
  })();

  const employeeIdentity = employeeCode ?? (employeeId ? employeeId.slice(0, 8) : null);

  return (
    <HeaderBar
      title="Employee Management"
      subtitle={lastLoginText ?? identityLabel}
      onToggleSidebar={onToggleSidebar}
      onToggleMobileSidebar={onToggleMobileSidebar}
      actions={(
        <>
          {!isEmployeePersona && subscription ? <StatusChip label={`${subscription.planName} - ${subscription.status}`} /> : null}
          {!isEmployeePersona && renewalLabel ? <StatusChip label={renewalLabel} tone="info" compact /> : null}
          {!isEmployeePersona && seatSummary ? <StatusChip label={`Seats ${seatLimitText}`} compact /> : null}
          {shiftText ? <StatusChip label={`Shift ${shiftText}`} compact /> : null}
          {isEmployeePersona && employeeIdentity ? <StatusChip label={`Employee ID ${employeeIdentity}`} compact /> : null}
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
