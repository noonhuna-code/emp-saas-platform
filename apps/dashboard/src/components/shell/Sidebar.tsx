import { RoleAwareNav, type NavItem } from "./RoleAwareNav";

const NAV_ITEMS: NavItem[] = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/profile", label: "My Profile" },
  { href: "/app/employees", label: "Employees", permission: "manage_employees", featureKey: "feature.core_employee_management" },
  { href: "/app/attendance", label: "Attendance", featureKey: "feature.core_attendance" },
  { href: "/app/attendance/review", label: "Attendance Review", permission: "manage_attendance", featureKey: "feature.core_attendance" },
  { href: "/app/attendance/team", label: "Team Attendance", permission: "manage_attendance", featureKey: "feature.core_attendance" },
  { href: "/app/leave", label: "Leave", featureKey: "feature.core_leave_management" },
  { href: "/app/payslips", label: "Payslips", featureKey: "feature.payslip_history_detail" },
  { href: "/app/leave/review", label: "Leave Review", permission: "manage_employees", featureKey: "feature.core_leave_management" },
  { href: "/app/approvals", label: "Approvals", permissionsAny: ["manage_employees", "manage_attendance"], featureKey: "feature.unified_approvals_workspace" },
  { href: "/app/overtime", label: "Overtime", featureKey: "feature.core_attendance" },
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
  entitlements
}: {
  permissions: string[];
  entitlements: Record<string, unknown> | null;
}) => {
  return (
    <aside className="sidebar">
      <div>
        <h2 style={{ margin: 0 }}>EMP OS</h2>
        <p style={{ margin: "4px 0 0", color: "#9eb0ea" }}>Enterprise Suite</p>
      </div>
      <RoleAwareNav items={NAV_ITEMS} permissions={permissions} entitlements={entitlements} />
    </aside>
  );
};
