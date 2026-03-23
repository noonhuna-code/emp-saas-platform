import { getLimitInteger, isFeatureEnabled } from "@/lib/client/entitlements";
import type { DashboardPersona } from "@/lib/dashboard/capabilities";

export type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  description?: string;
  personas?: DashboardPersona[];
  requiredCapability?: string | string[];
  requiresEmployeeContext?: boolean;
  requiredFeatureKey?: string;
  requiredFeatureAnyKeys?: string[];
  requiredLimitKey?: string;
};

export type NavigationGroup = {
  id: string;
  label: string;
  items: NavigationItem[];
};

export type NavigationVisibilityContext = {
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
  persona: DashboardPersona;
};

const ALL_PERSONAS: DashboardPersona[] = [
  "employee",
  "manager",
  "team_lead",
  "hr",
  "it",
  "admin",
  "founder",
  "finance",
  "platform_owner"
];

const item = (entry: NavigationItem): NavigationItem => entry;

export const TENANT_NAVIGATION_ITEMS: NavigationItem[] = [
  item({
    href: "/app/dashboard",
    label: "Home",
    icon: "home",
    description: "Role-aware command center",
    personas: ALL_PERSONAS.filter((persona) => persona !== "platform_owner")
  }),
  item({
    href: "/app/profile",
    label: "My Profile",
    icon: "user",
    description: "Identity, role, and personal profile",
    requiresEmployeeContext: true,
    personas: ["employee", "manager", "team_lead", "hr", "it", "admin", "founder", "finance"]
  }),
  item({
    href: "/app/employees",
    label: "People",
    icon: "users",
    description: "Employee directory and people operations",
    personas: ["manager", "team_lead", "hr", "admin", "founder", "finance", "it"],
    requiredCapability: ["manage_employees", "manage_company", "manage_reporting_lines", "manage_delegations"],
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/organization",
    label: "Organization",
    icon: "network",
    description: "Departments, teams, and reporting lines",
    personas: ["manager", "team_lead", "hr", "admin", "founder", "finance", "it"],
    requiredCapability: ["manage_employees", "manage_company", "manage_reporting_lines", "manage_delegations"],
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/attendance",
    label: "Attendance",
    icon: "clock-3",
    description: "Shifts, punches, and attendance history",
    personas: ["employee", "manager", "team_lead", "hr", "admin", "founder", "finance"],
    requiredCapability: ["view_attendance", "manage_attendance", "manage_employees"],
    requiredFeatureKey: "feature.core_attendance"
  }),
  item({
    href: "/app/leave",
    label: "Leave & Swaps",
    icon: "calendar-range",
    description: "Leave planning and shift exchanges",
    personas: ["employee", "manager", "team_lead", "hr", "admin", "founder", "finance"],
    requiresEmployeeContext: true,
    requiredFeatureAnyKeys: ["feature.core_leave_management", "feature.core_attendance"]
  }),
  item({
    href: "/app/payroll",
    label: "Payroll",
    icon: "wallet-cards",
    description: "Payroll operations and salary processing",
    personas: ["hr", "finance", "admin", "founder"],
    requiredCapability: ["manage_payroll", "manage_company", "manage_billing", "view_billing"],
    requiredFeatureKey: "feature.payroll_runs"
  }),
  item({
    href: "/app/projects",
    label: "Projects",
    icon: "briefcase-business",
    description: "Programs, delivery, and team ownership",
    personas: ["manager", "team_lead", "admin", "founder"],
    requiredFeatureKey: "feature.project_management_core"
  }),
  item({
    href: "/app/chat",
    label: "Inbox / Chat",
    icon: "messages-square",
    description: "Messages, requests, and shared updates",
    personas: ["employee", "manager", "team_lead", "hr", "it", "admin", "founder", "finance"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_notifications"
  }),
  item({
    href: "/app/resources",
    label: "Knowledge / SOPs",
    icon: "book-open-text",
    description: "Policies, SOPs, and operating guides",
    personas: ["employee", "manager", "team_lead", "hr", "it", "admin", "founder", "finance"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/analytics",
    label: "Analytics",
    icon: "chart-column-big",
    description: "Comparisons, workforce trends, and visibility",
    personas: ["manager", "team_lead", "hr", "it", "admin", "founder", "finance"],
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  }),
  item({
    href: "/app/settings",
    label: "Settings",
    icon: "settings-2",
    description: "Workspace preferences and operational controls",
    personas: ["employee", "manager", "team_lead", "hr", "it", "admin", "founder", "finance"]
  }),
  item({
    href: "/app/notifications",
    label: "Notifications",
    icon: "bell-dot",
    description: "Unread alerts and operational reminders",
    personas: ["employee", "manager", "team_lead", "hr", "it", "admin", "founder", "finance"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_notifications"
  }),
  item({
    href: "/app/notes",
    label: "Notes",
    icon: "notebook-tabs",
    description: "Private notes, attachments, and follow-ups",
    personas: ["employee", "manager", "team_lead", "hr", "it", "admin", "founder", "finance"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/approvals",
    label: "Approvals",
    icon: "badge-check",
    description: "Pending decisions and workflow queues",
    personas: ["manager", "team_lead", "hr", "admin", "founder", "finance"],
    requiredCapability: ["manage_employees", "manage_attendance", "manage_company"],
    requiredFeatureKey: "feature.unified_approvals_workspace"
  }),
  item({
    href: "/app/billing",
    label: "Billing",
    icon: "receipt-text",
    description: "Invoices, seats, and subscription controls",
    personas: ["finance", "admin", "founder"],
    requiredCapability: ["view_billing", "manage_billing", "manage_company"]
  }),
  item({
    href: "/app/monitoring",
    label: "System Monitor",
    icon: "shield-check",
    description: "Security signal and system health",
    personas: ["it", "admin", "founder"],
    requiredCapability: ["manage_company", "view_all_companies"],
    requiredFeatureKey: "feature.security_intelligence"
  })
];

const byHref = (href: string): NavigationItem => {
  const match = TENANT_NAVIGATION_ITEMS.find((entry) => entry.href === href);
  if (!match) throw new Error(`Unknown navigation item: ${href}`);
  return match;
};

export const TENANT_NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    id: "home",
    label: "Home",
    items: [byHref("/app/dashboard"), byHref("/app/profile")]
  },
  {
    id: "people",
    label: "People",
    items: [byHref("/app/employees"), byHref("/app/organization")]
  },
  {
    id: "operations",
    label: "Operations",
    items: [byHref("/app/attendance"), byHref("/app/leave"), byHref("/app/payroll"), byHref("/app/projects"), byHref("/app/approvals")]
  },
  {
    id: "collaboration",
    label: "Collaboration",
    items: [byHref("/app/chat"), byHref("/app/notifications"), byHref("/app/resources"), byHref("/app/notes")]
  },
  {
    id: "platform",
    label: "Platform",
    items: [byHref("/app/analytics"), byHref("/app/settings"), byHref("/app/billing"), byHref("/app/monitoring")]
  }
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
  { permissions, hasEmployeeContext, entitlements, persona }: NavigationVisibilityContext
) => {
  if (item.personas && !item.personas.includes(persona)) return false;
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
) => items.filter((entry) => canRenderNavigationItem(entry, context));

export const resolveVisibleNavigationGroups = (
  groups: NavigationGroup[],
  context: NavigationVisibilityContext
) => groups
  .map((group) => ({ ...group, items: resolveVisibleNavigationItems(group.items, context) }))
  .filter((group) => group.items.length > 0);

