"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type PlanRouteGuardProps = {
  entitlements: Record<string, unknown> | null;
  children: ReactNode;
};

type FeatureRule = {
  featureKey?: string;
  featureAnyKeys?: string[];
};

const FEATURE_RULES: Array<{ prefix: string; rule: FeatureRule }> = [
  { prefix: "/app/attendance", rule: { featureKey: "feature.core_attendance" } },
  { prefix: "/app/calendar", rule: { featureAnyKeys: ["feature.core_attendance", "feature.core_leave_management"] } },
  { prefix: "/app/leave", rule: { featureKey: "feature.core_leave_management" } },
  { prefix: "/app/overtime", rule: { featureKey: "feature.core_attendance" } },
  { prefix: "/app/employees", rule: { featureKey: "feature.core_employee_management" } },
  { prefix: "/app/org-chart", rule: { featureKey: "feature.core_employee_management" } },
  { prefix: "/app/approvals", rule: { featureKey: "feature.unified_approvals_workspace" } },
  { prefix: "/app/payroll", rule: { featureKey: "feature.payroll_runs" } },
  { prefix: "/app/payslips", rule: { featureKey: "feature.payslip_history_detail" } },
  { prefix: "/app/loans", rule: { featureKey: "feature.financial_obligations_loans_advances" } },
  { prefix: "/app/resources", rule: { featureKey: "feature.core_employee_management" } },
  { prefix: "/app/notes", rule: { featureKey: "feature.core_employee_management" } },
  { prefix: "/app/notifications", rule: { featureKey: "feature.core_notifications" } },
  { prefix: "/app/chat", rule: { featureKey: "feature.core_notifications" } },
  {
    prefix: "/app/intelligence",
    rule: { featureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"] }
  },
  { prefix: "/app/monitoring", rule: { featureKey: "feature.security_intelligence" } }
];

const resolveRuleForPath = (pathname: string): FeatureRule | null => {
  for (const item of FEATURE_RULES) {
    if (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)) {
      return item.rule;
    }
  }
  return null;
};

const hasFeature = (entitlements: Record<string, unknown>, key: string): boolean => {
  return entitlements[key] === true;
};

export const PlanRouteGuard = ({ entitlements, children }: PlanRouteGuardProps) => {
  const pathname = usePathname();

  // Entitlements can be temporarily unavailable during onboarding/bootstrap.
  if (!entitlements) {
    return <>{children}</>;
  }

  const rule = resolveRuleForPath(pathname);
  if (!rule) {
    return <>{children}</>;
  }

  let allowed = true;
  if (rule.featureKey) {
    allowed = hasFeature(entitlements, rule.featureKey);
  }
  if (allowed && rule.featureAnyKeys && rule.featureAnyKeys.length > 0) {
    allowed = rule.featureAnyKeys.some((key) => hasFeature(entitlements, key));
  }

  if (allowed) {
    return <>{children}</>;
  }

  return (
    <section className="card stack feature-locked" role="alert" aria-live="polite">
      <h2>Feature not enabled in your current plan</h2>
      <p className="muted">
        This module is currently unavailable. Upgrade your plan or contact your admin to enable access.
      </p>
      <div className="row">
        <Link href="/app/billing" className="secondary-btn">
          Open Billing
        </Link>
        <Link href="/app/dashboard" className="ghost-btn">
          Back to Dashboard
        </Link>
      </div>
    </section>
  );
};

