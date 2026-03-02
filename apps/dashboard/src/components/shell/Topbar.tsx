import { CompanyContextBadge } from "./CompanyContextBadge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { BillingNavigationContext } from "@/lib/types/billing";

export const Topbar = ({
  role,
  companyId,
  email,
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
  role: string | null;
  companyId: string | null;
  email: string | null | undefined;
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
  const subscription = billingContext?.subscription ?? null;
  const seatSummary = billingContext?.seatSummary ?? null;
  const seatLimitText =
    seatSummary?.seatLimit !== null && seatSummary?.seatLimit !== undefined
      ? `${seatSummary.activeBillable}/${seatSummary.seatLimit}`
      : `${seatSummary?.activeBillable ?? 0}`;

  const periodEndDate = subscription ? new Date(subscription.currentPeriodEnd) : null;
  const hasValidPeriod = periodEndDate ? Number.isFinite(periodEndDate.getTime()) : false;
  const periodEndMs = hasValidPeriod && periodEndDate ? periodEndDate.getTime() : null;
  const daysToPeriodEnd = hasValidPeriod
    ? Math.ceil(((periodEndMs ?? 0) - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const billingHint = (() => {
    if (!subscription) return null;
    if (subscription.status === "trialing" && daysToPeriodEnd !== null) {
      return daysToPeriodEnd >= 0 ? `Trial ${daysToPeriodEnd} day(s) left` : "Trial ended";
    }
    if (subscription.status === "past_due") {
      return "Payment overdue";
    }
    if (subscription.status === "active" && hasValidPeriod && periodEndDate) {
      return `Renews ${periodEndDate.toLocaleDateString()}`;
    }
    return null;
  })();

  const lastLoginText = (() => {
    if (!lastLoginAt) return null;
    const value = new Date(lastLoginAt);
    if (!Number.isFinite(value.getTime())) return null;
    return value.toLocaleString();
  })();

  const shiftText = (() => {
    if (!shiftStartTime || !shiftEndTime) return null;
    const hoursLabel = typeof shiftHours === "number" ? ` (${shiftHours}h)` : "";
    return `${shiftStartTime} - ${shiftEndTime}${hoursLabel}`;
  })();

  const identityLabel = fullName ?? email ?? "Authenticated user";

  return (
    <header className="topbar">
      <div className="stack topbar__identity" style={{ gap: 4 }}>
        <div className="row topbar__title-row">
          <button type="button" className="ghost-btn sidebar-toggle-desktop" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            &#8942;
          </button>
          <button type="button" className="ghost-btn sidebar-toggle-mobile" onClick={onToggleMobileSidebar} aria-label="Open menu">
            &#9776;
          </button>
          <strong>Employee Management</strong>
        </div>
        <span className="muted" style={{ fontSize: 13 }}>{identityLabel}</span>
        {lastLoginText ? <span className="muted" style={{ fontSize: 12 }}>Last login: {lastLoginText}</span> : null}
      </div>
      <div className="row topbar__actions">
        {subscription ? (
          <div
            className={`badge topbar__chip ${
              subscription.status === "past_due"
                ? "badge--warning"
                : subscription.status === "active"
                  ? "badge--success"
                  : "badge--info"
            }`}
          >
            <span>{subscription.planName}</span>
            <span style={{ margin: "0 6px" }}>|</span>
            <span>{subscription.status}</span>
          </div>
        ) : null}
        {billingHint ? (
          <div className={`badge topbar__chip ${subscription?.status === "past_due" ? "badge--danger" : "badge--info"}`}>
            <span>{billingHint}</span>
          </div>
        ) : null}
        {seatSummary ? (
          <div className="badge topbar__chip" title="Billable seats in current subscription">
            <span>Seats</span>
            <span style={{ margin: "0 6px" }}>|</span>
            <span>{seatLimitText}</span>
          </div>
        ) : null}
        {shiftText ? (
          <div className="badge topbar__chip" title="Today's shift window">
            <span>Shift</span>
            <span style={{ margin: "0 6px" }}>|</span>
            <span>{shiftText}</span>
          </div>
        ) : null}
        <div className="badge topbar__chip topbar__profile-chip" title={identityLabel}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile"
              width={20}
              height={20}
              style={{ borderRadius: "50%", marginRight: 8, objectFit: "cover" }}
            />
          ) : (
            <span style={{ marginRight: 8 }}>{(identityLabel[0] ?? "U").toUpperCase()}</span>
          )}
          <span className="topbar__profile-name">{fullName ?? email ?? "User"}</span>
        </div>
        <CompanyContextBadge companyId={companyId} role={role} />
        <ThemeToggle />
        <form action="/api/auth/logout" method="post">
          <button type="submit" className="secondary-btn">
            Logout
          </button>
        </form>
      </div>
    </header>
  );
};
