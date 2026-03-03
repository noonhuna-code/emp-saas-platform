import { getLimitInteger, isFeatureEnabled } from "@/lib/client/entitlements";

export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  requiredCapability?: string | string[];
  requiresEmployeeContext?: boolean;
  requiredFeatureKey?: string;
  requiredFeatureAnyKeys?: string[];
  requiredLimitKey?: string;
};

export type NavigationVisibilityContext = {
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
};

export const TENANT_NAVIGATION_ITEMS: NavigationItem[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: "home" },
  { href: "/app/profile", label: "My Profile", icon: "user" },
  {
    href: "/app/employees",
    label: "Employees",
    icon: "users",
    requiredCapability: "manage_employees",
    requiredFeatureKey: "feature.core_employee_management"
  },
  {
    href: "/app/attendance",
    label: "Attendance",
    icon: "clock",
    requiredCapability: ["view_attendance", "manage_attendance"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_attendance"
  },
  {
    href: "/app/calendar",
    label: "Work Calendar",
    icon: "calendar",
    requiredCapability: ["view_attendance", "manage_attendance"],
    requiresEmployeeContext: true,
    requiredFeatureAnyKeys: ["feature.core_attendance", "feature.core_leave_management"]
  },
  {
    href: "/app/attendance/review",
    label: "Attendance Review",
    icon: "check",
    requiredCapability: "manage_attendance",
    requiredFeatureKey: "feature.core_attendance"
  },
  {
    href: "/app/attendance/team",
    label: "Team Attendance",
    icon: "team",
    requiredCapability: "manage_attendance",
    requiredFeatureKey: "feature.core_attendance"
  },
  {
    href: "/app/attendance/shifts",
    label: "Shift Assignment",
    icon: "shift",
    requiredCapability: ["manage_attendance", "manage_employees"],
    requiredFeatureKey: "feature.core_attendance"
  },
  {
    href: "/app/attendance/shift-swaps",
    label: "Shift Swaps",
    icon: "swap",
    requiredCapability: ["view_attendance", "manage_attendance", "manage_employees"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_attendance"
  },
  {
    href: "/app/leave",
    label: "Leave",
    icon: "leave",
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_leave_management"
  },
  {
    href: "/app/leave/review",
    label: "Leave Review",
    icon: "review",
    requiredCapability: "manage_employees",
    requiredFeatureKey: "feature.core_leave_management"
  },
  {
    href: "/app/payslips",
    label: "Payslips",
    icon: "wallet",
    requiredFeatureKey: "feature.payslip_history_detail"
  },
  {
    href: "/app/loans",
    label: "Loans & Advances",
    icon: "bank",
    requiresEmployeeContext: true,
    requiredCapability: [
      "request_loan",
      "request_salary_advance",
      "review_loan_requests",
      "review_salary_advance",
      "manage_obligation_creation"
    ],
    requiredFeatureKey: "feature.financial_obligations_loans_advances"
  },
  {
    href: "/app/resources",
    label: "SOP Resources",
    icon: "book",
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_employee_management"
  },
  {
    href: "/app/notes",
    label: "My Notes",
    icon: "note",
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_employee_management"
  },
  {
    href: "/app/chat",
    label: "Team Chat",
    icon: "chat",
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_notifications"
  },
  {
    href: "/app/notifications",
    label: "Notifications",
    icon: "bell",
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_notifications"
  },
  {
    href: "/app/approvals",
    label: "Approvals",
    icon: "approve",
    requiredCapability: ["manage_employees", "manage_attendance"],
    requiredFeatureKey: "feature.unified_approvals_workspace"
  },
  {
    href: "/app/overtime",
    label: "Overtime",
    icon: "time",
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_attendance"
  },
  {
    href: "/app/overtime/review",
    label: "Overtime Review",
    icon: "checklist",
    requiredCapability: "manage_attendance",
    requiredFeatureKey: "feature.core_attendance"
  },
  {
    href: "/app/payroll",
    label: "Payroll",
    icon: "payroll",
    requiredCapability: ["manage_payroll", "manage_company"],
    requiredFeatureKey: "feature.payroll_runs"
  },
  {
    href: "/app/billing",
    label: "Billing",
    icon: "billing",
    requiredCapability: ["view_billing", "manage_billing", "manage_company"]
  },
  {
    href: "/app/org-chart",
    label: "Org Chart",
    icon: "org",
    requiredCapability: "manage_employees",
    requiredFeatureKey: "feature.core_employee_management"
  },
  {
    href: "/app/intelligence/reliability",
    label: "Reliability",
    icon: "chart",
    requiredCapability: "manage_employees",
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  },
  {
    href: "/app/intelligence/feedback",
    label: "Supervisor Feedback",
    icon: "feedback",
    requiredCapability: "manage_employees",
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  },
  {
    href: "/app/intelligence/kudos",
    label: "Kudos",
    icon: "spark",
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  },
  {
    href: "/app/monitoring",
    label: "Monitoring",
    icon: "shield",
    requiredCapability: "manage_company",
    requiredFeatureKey: "feature.security_intelligence"
  }
];

export const PLATFORM_NAVIGATION_ITEMS: NavigationItem[] = [
  { href: "/platform", label: "Overview", icon: "home" },
  { href: "/app/dashboard", label: "Tenant App (restricted)", icon: "lock" },
  { href: "/app/monitoring", label: "Tenant Monitoring", icon: "shield" }
];

const hasCapability = (permissions: string[], required?: string | string[]) => {
  if (!required) return true;
  if (Array.isArray(required)) return required.some((permission) => permissions.includes(permission));
  return permissions.includes(required);
};

const hasFeature = (entitlements: Record<string, unknown> | null, key: string) => {
  if (!entitlements) return true;
  return isFeatureEnabled(entitlements, key);
};

const hasAnyFeature = (entitlements: Record<string, unknown> | null, keys?: string[]) => {
  if (!keys || keys.length === 0) return true;
  if (!entitlements) return true;
  return keys.some((key) => isFeatureEnabled(entitlements, key));
};

const hasLimit = (entitlements: Record<string, unknown> | null, limitKey?: string) => {
  if (!limitKey) return true;
  if (!entitlements) return true;
  return getLimitInteger(entitlements, limitKey) !== null;
};

export const canRenderNavigationItem = (
  item: NavigationItem,
  { permissions, hasEmployeeContext, entitlements }: NavigationVisibilityContext
) => {
  if (item.requiresEmployeeContext && !hasEmployeeContext) return false;
  if (!hasCapability(permissions, item.requiredCapability)) return false;
  if (item.requiredFeatureKey && !hasFeature(entitlements, item.requiredFeatureKey)) return false;
  if (!hasAnyFeature(entitlements, item.requiredFeatureAnyKeys)) return false;
  if (!hasLimit(entitlements, item.requiredLimitKey)) return false;
  return true;
};

export const resolveVisibleNavigationItems = (
  items: NavigationItem[],
  context: NavigationVisibilityContext
) => items.filter((item) => canRenderNavigationItem(item, context));
