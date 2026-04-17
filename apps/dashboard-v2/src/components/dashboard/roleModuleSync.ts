import type { LucideIcon } from "lucide-react";

export type DashboardModuleCard = {
  title: string;
  description: string;
  href: string;
  label?: string;
  metric?: string;
  highlights?: string[];
  icon?: LucideIcon;
};

const normalizeHref = (href: string) => href.replace(/\/+$/, "") || href;

const MODULE_LIBRARY: Record<string, Omit<DashboardModuleCard, "href">> = {
  "/app/analytics": {
    title: "Analytics and trend reading",
    description: "Review cross-workspace trends and summary signals from the same role-aware shell.",
    label: "Analytics",
    metric: "Trend view",
    highlights: ["Analytics", "Trends", "Signals"],
  },
  "/app/approvals": {
    title: "Approvals and queue pressure",
    description: "Open the shared queue for the decisions and blockers that need action next.",
    label: "Queue",
    metric: "Action ready",
    highlights: ["Approvals", "Queue", "Exceptions"],
  },
  "/app/attendance/review": {
    title: "Attendance review lane",
    description: "Resolve attendance exceptions, corrections, and late-login review from one focused module.",
    label: "Attendance",
    metric: "Review",
    highlights: ["Corrections", "Late login", "Attendance"],
  },
  "/app/attendance/shifts": {
    title: "Shift and break assignments",
    description: "Manage shift templates, break posture, and assignment changes without leaving the main role home.",
    label: "Shifts",
    metric: "Assignments",
    highlights: ["Shifts", "Breaks", "Coverage"],
  },
  "/app/billing": {
    title: "Billing and commercial posture",
    description: "Stay close to invoices, seat pressure, and subscription state before they become blockers.",
    label: "Billing",
    metric: "Commercial",
    highlights: ["Invoices", "Seats", "Plan status"],
  },
  "/app/calendar": {
    title: "Calendar and schedule context",
    description: "Keep upcoming shifts, leave dates, and time-aware planning visible from the dashboard.",
    label: "Calendar",
    metric: "Schedule",
    highlights: ["Calendar", "Shifts", "Planning"],
  },
  "/app/chat": {
    title: "Chat and coordination",
    description: "Jump into role-safe team communication without losing the current workflow context.",
    label: "Collaboration",
    metric: "Live",
    highlights: ["Chat", "Team updates", "Coordination"],
  },
  "/app/monitoring": {
    title: "Monitoring and risk posture",
    description: "Keep health, audit, and operational recovery signals close to the workspace.",
    label: "Monitoring",
    metric: "Live",
    highlights: ["Health", "Audit", "Recovery"],
  },
  "/app/notifications": {
    title: "Notifications and alerts",
    description: "Stay close to reminders, workflow updates, and delivery alerts that affect your role.",
    label: "Alerts",
    metric: "Inbox",
    highlights: ["Notifications", "Alerts", "Updates"],
  },
  "/app/organization": {
    title: "Organization and structure",
    description: "Review reporting structure, company layout, and organizational context from one module.",
    label: "Structure",
    metric: "Org view",
    highlights: ["Hierarchy", "Departments", "Reporting"],
  },
  "/app/payroll": {
    title: "Payroll lifecycle view",
    description: "Open payroll readiness, run posture, and closeout context from a cleaner route entry.",
    label: "Payroll",
    metric: "Run view",
    highlights: ["Runs", "Readiness", "Closeout"],
  },
  "/app/payslips": {
    title: "Payslip history and delivery",
    description: "Stay close to salary snapshots and employee-facing payroll delivery records.",
    label: "Payslips",
    metric: "History",
    highlights: ["Payslips", "Delivery", "History"],
  },
  "/app/people": {
    title: "People directory and context",
    description: "Search people, reporting lines, and assignment context from the unified directory lane.",
    label: "People",
    metric: "Directory",
    highlights: ["Directory", "Profiles", "Relationships"],
  },
  "/app/employees": {
    title: "Employee records and lookup",
    description: "Open employee records, profile context, and assignment entry points from one module.",
    label: "Employees",
    metric: "Records",
    highlights: ["Profiles", "Records", "Assignments"],
  },
  "/app/profile": {
    title: "Profile and personal records",
    description: "Review personal details, documents, and self-service record upkeep from the dashboard.",
    label: "Profile",
    metric: "Self service",
    highlights: ["Profile", "Documents", "Records"],
  },
  "/app/projects": {
    title: "Projects and delivery flow",
    description: "Move into project staffing, task posture, and execution context from the same workspace shell.",
    label: "Projects",
    metric: "Execution",
    highlights: ["Projects", "Tasks", "Staffing"],
  },
  "/app/resources": {
    title: "Resources and SOPs",
    description: "Open SOPs, saved files, and operating guidance without switching to another surface first.",
    label: "Resources",
    metric: "Knowledge",
    highlights: ["SOPs", "Files", "Guidance"],
  },
  "/app/settings": {
    title: "Settings and workspace controls",
    description: "Jump into account, device, and role-sensitive workspace preferences from the dashboard.",
    label: "Settings",
    metric: "Controls",
    highlights: ["Account", "Devices", "Preferences"],
  },
};

export const syncRoleWorkspaceModules = ({
  baseModules,
  allowedRoutes,
  preferredRoutes,
  maxModules = 6,
}: {
  baseModules: DashboardModuleCard[];
  allowedRoutes: Iterable<string>;
  preferredRoutes: string[];
  maxModules?: number;
}): DashboardModuleCard[] => {
  const allowed = new Set(Array.from(allowedRoutes, normalizeHref));
  const seen = new Set(baseModules.map((module) => normalizeHref(module.href)));
  const next = [...baseModules];

  for (const route of preferredRoutes) {
    const normalizedRoute = normalizeHref(route);
    if (!allowed.has(normalizedRoute) || seen.has(normalizedRoute)) continue;

    const moduleCard = MODULE_LIBRARY[normalizedRoute];
    if (!moduleCard) continue;

    next.push({
      href: normalizedRoute,
      ...moduleCard,
    });
    seen.add(normalizedRoute);

    if (next.length >= maxModules) break;
  }

  return next;
};
