"use client";

import { RoleAwareNav, type NavItem } from "./RoleAwareNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/profile", label: "My Profile" },
  { href: "/app/employees", label: "Employees", permission: "manage_employees", featureKey: "feature.core_employee_management" },
  {
    href: "/app/attendance",
    label: "Attendance",
    permissionsAny: ["view_attendance", "manage_attendance"],
    requiresEmployeeContext: true,
    featureKey: "feature.core_attendance"
  },
  { href: "/app/attendance/review", label: "Attendance Review", permission: "manage_attendance", featureKey: "feature.core_attendance" },
  { href: "/app/attendance/team", label: "Team Attendance", permission: "manage_attendance", featureKey: "feature.core_attendance" },
  { href: "/app/attendance/shifts", label: "Shift Assignment", permissionsAny: ["manage_attendance", "manage_employees"], featureKey: "feature.core_attendance" },
  { href: "/app/leave", label: "Leave", requiresEmployeeContext: true, featureKey: "feature.core_leave_management" },
  { href: "/app/payslips", label: "Payslips", featureKey: "feature.payslip_history_detail" },
  {
    href: "/app/loans",
    label: "Loans & Advances",
    requiresEmployeeContext: true,
    permissionsAny: ["request_loan", "request_salary_advance", "review_loan_requests", "review_salary_advance", "manage_obligation_creation"],
    featureKey: "feature.financial_obligations_loans_advances"
  },
  { href: "/app/resources", label: "SOP Resources", requiresEmployeeContext: true, featureKey: "feature.core_employee_management" },
  { href: "/app/notes", label: "My Notes", requiresEmployeeContext: true, featureKey: "feature.core_employee_management" },
  { href: "/app/notifications", label: "Notifications", requiresEmployeeContext: true, featureKey: "feature.core_notifications" },
  { href: "/app/chat", label: "Team Chat", requiresEmployeeContext: true, featureKey: "feature.core_notifications" },
  { href: "/app/leave/review", label: "Leave Review", permission: "manage_employees", featureKey: "feature.core_leave_management" },
  { href: "/app/approvals", label: "Approvals", permissionsAny: ["manage_employees", "manage_attendance"], featureKey: "feature.unified_approvals_workspace" },
  { href: "/app/overtime", label: "Overtime", requiresEmployeeContext: true, featureKey: "feature.core_attendance" },
  { href: "/app/overtime/review", label: "Overtime Review", permission: "manage_attendance", featureKey: "feature.core_attendance" },
  { href: "/app/payroll", label: "Payroll", permissionsAny: ["manage_payroll", "manage_company"], featureKey: "feature.payroll_runs" },
  { href: "/app/billing", label: "Billing", permissionsAny: ["view_billing", "manage_billing", "manage_company"] },
  { href: "/app/org-chart", label: "Org Chart", permission: "manage_employees", featureKey: "feature.core_employee_management" },
  { href: "/app/intelligence/reliability", label: "Reliability", permission: "manage_employees", featureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"] },
  { href: "/app/intelligence/feedback", label: "Supervisor Feedback", permission: "manage_employees", featureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"] },
  { href: "/app/intelligence/kudos", label: "Kudos", featureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"] },
  { href: "/app/monitoring", label: "Monitoring", permission: "manage_company", featureKey: "feature.security_intelligence" }
];

export const Sidebar = ({
  permissions,
  hasEmployeeContext,
  entitlements,
  collapsed,
  mobileOpen,
  onToggleCollapsed,
  onCloseMobile
}: {
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
}) => {
  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""} ${mobileOpen ? "sidebar--open" : ""}`}>
      <div className="sidebar__head">
        <div>
          <h2 style={{ margin: 0 }}>{collapsed ? "EMP" : "EMP OS"}</h2>
          {!collapsed ? <p style={{ margin: "4px 0 0", color: "#9eb0ea" }}>Enterprise Suite</p> : null}
        </div>
        <button type="button" className="ghost-btn sidebar__toggle" onClick={onToggleCollapsed} aria-label="Toggle sidebar">
          &#8942;
        </button>
      </div>
      <RoleAwareNav
        items={NAV_ITEMS}
        permissions={permissions}
        hasEmployeeContext={hasEmployeeContext}
        entitlements={entitlements}
        collapsed={collapsed}
        onNavigate={onCloseMobile}
      />
    </aside>
  );
};
