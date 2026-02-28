import { CompanyContextBadge } from "./CompanyContextBadge";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { BillingNavigationContext } from "@/lib/types/billing";

export const Topbar = ({
  role,
  companyId,
  email,
  billingContext
}: {
  role: string | null;
  companyId: string | null;
  email: string | null | undefined;
  billingContext: BillingNavigationContext | null;
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

  return (
    <header className="topbar">
      <div className="stack" style={{ gap: 4 }}>
        <strong>Employee Management</strong>
        <span className="muted" style={{ fontSize: 13 }}>
          {email ?? "Authenticated user"}
        </span>
      </div>
      <div className="row">
        {subscription ? (
          <div
            className={`badge ${
              subscription.status === "past_due"
                ? "badge--warning"
                : subscription.status === "active"
                  ? "badge--success"
                  : "badge--info"
            }`}
          >
            <span>{subscription.planName}</span>
            <span style={{ margin: "0 6px" }}>·</span>
            <span>{subscription.status}</span>
          </div>
        ) : null}
        {billingHint ? (
          <div className={`badge ${subscription?.status === "past_due" ? "badge--danger" : "badge--info"}`}>
            <span>{billingHint}</span>
          </div>
        ) : null}
        {seatSummary ? (
          <div className="badge" title="Billable seats in current subscription">
            <span>Seats</span>
            <span style={{ margin: "0 6px" }}>·</span>
            <span>{seatLimitText}</span>
          </div>
        ) : null}
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
