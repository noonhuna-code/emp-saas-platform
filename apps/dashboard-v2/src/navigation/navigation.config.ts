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
  description?: string;
  items: NavigationItem[];
};

export type NavigationVisibilityContext = {
  permissions: string[];
  hasEmployeeContext: boolean;
  entitlements: Record<string, unknown> | null;
  persona: DashboardPersona;
};

export type ShellHeaderTab = {
  label: string;
  href: string;
};

export type ShellHeaderMeta = {
  groupLabel: string;
  itemLabel: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  tabs: ShellHeaderTab[];
};

const ALL_PERSONAS: DashboardPersona[] = [
  "employee",
  "manager",
  "admin_ops",
  "finance",
  "executive",
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
    personas: ["employee", "manager", "admin_ops", "finance", "executive"]
  }),
  item({
    href: "/app/employees",
    label: "People",
    icon: "users",
    description: "Employee directory and people operations",
    personas: ["manager", "admin_ops", "finance", "executive"],
    requiredCapability: ["manage_employees", "manage_company", "manage_reporting_lines", "manage_delegations"],
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/organization",
    label: "Organization",
    icon: "network",
    description: "Departments, teams, and reporting lines",
    personas: ["manager", "admin_ops", "finance", "executive"],
    requiredCapability: ["manage_employees", "manage_company", "manage_reporting_lines", "manage_delegations"],
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/org-chart",
    label: "Org Chart",
    icon: "network",
    description: "Structure map and reporting relationships",
    personas: ["manager", "admin_ops", "finance", "executive"],
    requiredCapability: ["manage_employees", "manage_company", "manage_reporting_lines", "manage_delegations"],
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/attendance",
    label: "Attendance",
    icon: "clock-3",
    description: "Shifts, punches, and attendance history",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiredCapability: ["view_attendance", "manage_attendance", "manage_employees"],
    requiredFeatureKey: "feature.core_attendance"
  }),
  item({
    href: "/app/leave",
    label: "Leave & Swaps",
    icon: "calendar-range",
    description: "Leave planning and shift exchanges",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_leave_management"
  }),
  item({
    href: "/app/calendar",
    label: "Calendar",
    icon: "calendar-days",
    description: "Unified shift, leave, holiday, and company timeline",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureAnyKeys: ["feature.core_leave_management", "feature.core_attendance"]
  }),
  item({
    href: "/app/overtime",
    label: "Overtime",
    icon: "timer",
    description: "Request and review overtime hours",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_attendance"
  }),
  item({
    href: "/app/loans",
    label: "Loans & Advances",
    icon: "hand-coins",
    description: "Track salary advances and loan requests",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.financial_obligations_loans_advances"
  }),
  item({
    href: "/app/payslips",
    label: "Payslips",
    icon: "scroll-text",
    description: "Payroll snapshots and statement history",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.payslip_history_detail"
  }),
  item({
    href: "/app/payroll",
    label: "Payroll",
    icon: "wallet-cards",
    description: "Payroll operations and salary processing",
    personas: ["admin_ops", "finance", "executive"],
    requiredCapability: ["manage_payroll", "manage_company", "manage_billing", "view_billing"],
    requiredFeatureKey: "feature.payroll_runs"
  }),
  item({
    href: "/app/projects",
    label: "Projects",
    icon: "briefcase-business",
    description: "Programs, delivery, and team ownership",
    personas: ["manager", "admin_ops", "executive"],
    requiredFeatureKey: "feature.project_management_core"
  }),
  item({
    href: "/app/chat",
    label: "Inbox / Chat",
    icon: "messages-square",
    description: "Messages, requests, and shared updates",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_notifications"
  }),
  item({
    href: "/app/resources",
    label: "Knowledge / SOPs",
    icon: "book-open-text",
    description: "Policies, SOPs, and operating guides",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/analytics",
    label: "Analytics",
    icon: "chart-column-big",
    description: "Comparisons, workforce trends, and visibility",
    personas: ["manager", "admin_ops", "finance", "executive"],
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  }),
  item({
    href: "/app/intelligence/kudos",
    label: "Kudos",
    icon: "sparkles",
    description: "Recognition, appreciation, and peer highlights",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  }),
  item({
    href: "/app/intelligence/reliability",
    label: "Reliability",
    icon: "activity",
    description: "Work rhythm, reliability, and team consistency signals",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  }),
  item({
    href: "/app/intelligence/feedback",
    label: "Feedback",
    icon: "message-square-heart",
    description: "Supervisor feedback and coaching history",
    personas: ["manager", "admin_ops", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureAnyKeys: ["feature.analytics_standard", "feature.analytics_advanced"]
  }),
  item({
    href: "/app/settings",
    label: "Settings",
    icon: "settings-2",
    description: "Workspace preferences and operational controls",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"]
  }),
  item({
    href: "/app/notifications",
    label: "Notifications",
    icon: "bell-dot",
    description: "Unread alerts and operational reminders",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_notifications"
  }),
  item({
    href: "/app/notes",
    label: "Notes",
    icon: "notebook-tabs",
    description: "Private notes, attachments, and follow-ups",
    personas: ["employee", "manager", "admin_ops", "finance", "executive"],
    requiresEmployeeContext: true,
    requiredFeatureKey: "feature.core_employee_management"
  }),
  item({
    href: "/app/approvals",
    label: "Approvals",
    icon: "badge-check",
    description: "Pending decisions and workflow queues",
    personas: ["manager", "admin_ops", "finance", "executive"],
    requiredCapability: ["manage_employees", "manage_attendance", "manage_company"],
    requiredFeatureKey: "feature.unified_approvals_workspace"
  }),
  item({
    href: "/app/billing",
    label: "Billing",
    icon: "receipt-text",
    description: "Invoices, seats, and subscription controls",
    personas: ["finance", "admin_ops", "executive"],
    requiredCapability: ["view_billing", "manage_billing", "manage_company"]
  }),
  item({
    href: "/app/monitoring",
    label: "System Monitor",
    icon: "shield-check",
    description: "Security signal and system health",
    personas: ["admin_ops", "executive"],
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
    description: "Workspace entry and personal identity surfaces",
    items: [byHref("/app/dashboard"), byHref("/app/profile"), byHref("/app/settings")]
  },
  {
    id: "workday",
    label: "Workday",
    description: "Daily time, leave, schedule, and self-service finance tasks",
    items: [
      byHref("/app/attendance"),
      byHref("/app/leave"),
      byHref("/app/calendar"),
      byHref("/app/overtime"),
      byHref("/app/loans"),
      byHref("/app/payslips")
    ]
  },
  {
    id: "collaboration",
    label: "Collaboration",
    description: "Inbox, notes, knowledge, and communication context",
    items: [byHref("/app/chat"), byHref("/app/notifications"), byHref("/app/resources"), byHref("/app/notes")]
  },
  {
    id: "people",
    label: "People & Org",
    description: "Directory, org structure, team coverage, and reporting context",
    items: [byHref("/app/employees"), byHref("/app/organization"), byHref("/app/org-chart")]
  },
  {
    id: "intelligence",
    label: "Intelligence",
    description: "Recognition, reliability, and workforce insight surfaces",
    items: [byHref("/app/intelligence/kudos"), byHref("/app/intelligence/reliability"), byHref("/app/intelligence/feedback"), byHref("/app/analytics")]
  },
  {
    id: "operations",
    label: "Operations",
    description: "Workflow queues, project execution, payroll, and system-level controls",
    items: [byHref("/app/approvals"), byHref("/app/projects"), byHref("/app/payroll"), byHref("/app/billing"), byHref("/app/monitoring")]
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

const findActiveNavigationEntry = (pathname: string, groups: NavigationGroup[]) => {
  for (const group of groups) {
    const item = group.items.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
    if (item) {
      return { group, item };
    }
  }

  return null;
};

const pickVisibleTabs = (hrefs: string[], groups: NavigationGroup[]): ShellHeaderTab[] => {
  const visibleItems = new Map(groups.flatMap((group) => group.items.map((item) => [item.href, item])));
  return hrefs
    .map((href) => visibleItems.get(href))
    .filter((item): item is NavigationItem => Boolean(item))
    .map((item) => ({ label: item.label, href: item.href }));
};

const PERSONA_HOME_COPY: Record<DashboardPersona, { title: string; subtitle: string }> = {
  employee: {
    title: "Personal workspace",
    subtitle: "Track your day, requests, records, and support context from one calmer command surface."
  },
  manager: {
    title: "Manager command center",
    subtitle: "Review team operations, approvals, people context, and execution signals without losing focus."
  },
  admin_ops: {
    title: "Operations control workspace",
    subtitle: "Coordinate people operations, controls, payroll visibility, and governance paths from one role-aware shell."
  },
  executive: {
    title: "Executive workspace",
    subtitle: "Keep strategic visibility, company posture, and key operating signals calm, dense, and decision-ready."
  },
  finance: {
    title: "Finance operations workspace",
    subtitle: "Stay close to billing, payroll visibility, and financial workflow context without clutter."
  },
  platform_owner: {
    title: "Platform oversight",
    subtitle: "Review cross-tenant posture, governance, and platform-wide health from one global shell."
  }
};

export const resolveShellHeaderMeta = (
  pathname: string,
  context: NavigationVisibilityContext
): ShellHeaderMeta => {
  const visibleGroups = resolveVisibleNavigationGroups(TENANT_NAVIGATION_GROUPS, context);
  const activeEntry = findActiveNavigationEntry(pathname, visibleGroups);
  const fallbackItemLabel = activeEntry?.item.label ?? "Current view";
  const fallbackGroupLabel = activeEntry?.group.label ?? "Workspace";
  const fallbackSubtitle = activeEntry?.item.description ?? "Search people, workflows, and actions";
  const dashboardCopy = PERSONA_HOME_COPY[context.persona];

  if (pathname === "/app/dashboard" || pathname.startsWith("/app/dashboard/")) {
    return {
      groupLabel: "Home",
      itemLabel: "Dashboard",
      title: dashboardCopy.title,
      subtitle: dashboardCopy.subtitle,
      searchPlaceholder:
        context.persona === "employee"
          ? "Search notes, resources, requests, and workspace actions"
          : "Search people, approvals, workflows, and operating actions",
      tabs: pickVisibleTabs(["/app/dashboard", "/app/profile"], visibleGroups)
    };
  }

  if (
    pathname === "/app/organization" ||
    pathname.startsWith("/app/organization/") ||
    pathname === "/app/people" ||
    pathname.startsWith("/app/people/") ||
    pathname === "/app/org-chart" ||
    pathname.startsWith("/app/org-chart/")
  ) {
    return {
      groupLabel: "People",
      itemLabel:
        pathname === "/app/people" || pathname.startsWith("/app/people/")
          ? "People"
          : pathname === "/app/org-chart" || pathname.startsWith("/app/org-chart/")
            ? "Org chart"
            : "Organization",
      title: "Organization workspace",
      subtitle: "Read structure, people placement, reporting context, and organization signals without cluttering the command row.",
      searchPlaceholder: "Search people, teams, departments, reporting lines, and org units",
      tabs: pickVisibleTabs(["/app/organization", "/app/people", "/app/org-chart"], visibleGroups)
    };
  }

  if (
    pathname === "/app/chat" ||
    pathname.startsWith("/app/chat/") ||
    pathname === "/app/notes" ||
    pathname.startsWith("/app/notes/") ||
    pathname === "/app/notifications" ||
    pathname.startsWith("/app/notifications/") ||
    pathname === "/app/resources" ||
    pathname.startsWith("/app/resources/")
  ) {
    return {
      groupLabel: "Collaboration",
      itemLabel: fallbackItemLabel,
      title: fallbackItemLabel,
      subtitle: fallbackSubtitle,
      searchPlaceholder: "Search conversations, notes, resources, and updates",
      tabs: pickVisibleTabs(["/app/chat", "/app/notes", "/app/notifications", "/app/resources"], visibleGroups)
    };
  }

  if (
    pathname === "/app/attendance" ||
    pathname.startsWith("/app/attendance/") ||
    pathname === "/app/leave" ||
    pathname.startsWith("/app/leave/") ||
    pathname === "/app/approvals" ||
    pathname.startsWith("/app/approvals/") ||
    pathname === "/app/payroll" ||
    pathname.startsWith("/app/payroll/") ||
    pathname === "/app/projects" ||
    pathname.startsWith("/app/projects/")
  ) {
    return {
      groupLabel: "Operations",
      itemLabel: fallbackItemLabel,
      title: fallbackItemLabel,
      subtitle: fallbackSubtitle,
      searchPlaceholder: "Search attendance, leave, approvals, payroll, and project workflows",
      tabs: pickVisibleTabs(["/app/attendance", "/app/leave", "/app/approvals", "/app/payroll", "/app/projects"], visibleGroups)
    };
  }

  if (
    pathname === "/app/analytics" ||
    pathname.startsWith("/app/analytics/") ||
    pathname === "/app/settings" ||
    pathname.startsWith("/app/settings/") ||
    pathname === "/app/billing" ||
    pathname.startsWith("/app/billing/") ||
    pathname === "/app/monitoring" ||
    pathname.startsWith("/app/monitoring/")
  ) {
    return {
      groupLabel: "Platform",
      itemLabel: fallbackItemLabel,
      title: fallbackItemLabel,
      subtitle: fallbackSubtitle,
      searchPlaceholder: "Search analytics, settings, billing, and monitoring controls",
      tabs: pickVisibleTabs(["/app/analytics", "/app/settings", "/app/billing", "/app/monitoring"], visibleGroups)
    };
  }

  return {
    groupLabel: fallbackGroupLabel,
    itemLabel: fallbackItemLabel,
    title: fallbackItemLabel,
    subtitle: fallbackSubtitle,
    searchPlaceholder: `Search ${fallbackItemLabel.toLowerCase()}, people, workflows, and docs`,
    tabs: []
  };
};

