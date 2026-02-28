import { resolvePayrollCapabilities, type PayrollCapability } from "@emp/lib/payroll-capabilities";
import { resolveDashboardCapabilities } from "./capabilities";

export type DashboardWidget =
  | "employee_self_summary"
  | "attendance_overview"
  | "leave_overview"
  | "payroll_summary"
  | "payroll_trend"
  | "payroll_delivery_success"
  | "payroll_closeout_latency"
  | "payroll_growth"
  | "department_cost_breakdown"
  | "pending_payroll_runs"
  | "pending_leave_approvals"
  | "headcount_overview"
  | "system_health";

/**
 * Prompt correction:
 * The requested widget map includes non-payroll capabilities (e.g. `view_leave`,
 * `manage_leave`, `manage_company`) that do not exist in the backend
 * `PayrollCapability` union. We keep `PayrollCapability` imported as requested
 * and extend it with dashboard-only view composition capabilities.
 *
 * This helper is UI composition only. Backend services remain the source of
 * truth for authorization and tenant isolation.
 */
export type DashboardWidgetCapability =
  | PayrollCapability
  | "view_attendance"
  | "view_leave"
  | "manage_payroll"
  | "manage_leave"
  | "view_employee_directory"
  | "manage_company";

type DashboardSessionPayload = {
  role: string | null;
  permissions: string[];
};

const unique = <T extends string>(values: Iterable<T>): T[] => Array.from(new Set(values));

/**
 * Role expectation matrix (frontend widget composition only)
 *
 * EMPLOYEE:
 *   employee_self_summary
 *   attendance_overview
 *   leave_overview
 *
 * HR:
 *   payroll_summary
 *   pending_payroll_runs
 *   attendance_overview
 *   leave_overview
 *
 * ADMIN:
 *   All HR widgets +
 *   system_health
 *
 * FOUNDER / CEO:
 *   payroll_summary
 *   payroll_trend
 *   department_cost_breakdown
 *   headcount_overview
 *
 * PLATFORM_OWNER:
 *   No company dashboard widgets
 *   Separate platform dashboard only
 */
const widgetCapabilityMap: Record<DashboardWidget, DashboardWidgetCapability[]> = {
  employee_self_summary: ["view_own_payslip"],
  attendance_overview: ["view_attendance"],
  leave_overview: ["view_leave"],
  payroll_summary: ["view_payroll_summary"],
  payroll_trend: ["view_payroll_analytics"],
  payroll_delivery_success: ["view_payroll_analytics"],
  payroll_closeout_latency: ["view_payroll_analytics"],
  payroll_growth: ["view_payroll_analytics"],
  department_cost_breakdown: ["view_payroll_analytics"],
  pending_payroll_runs: ["manage_payroll"],
  pending_leave_approvals: ["manage_leave"],
  headcount_overview: ["view_employee_directory"],
  system_health: ["manage_company"]
};

export const resolveDashboardWidgetCapabilities = (
  session: DashboardSessionPayload
): DashboardWidgetCapability[] => {
  const caps = new Set<DashboardWidgetCapability>();

  // Base self-service widgets for authenticated dashboard users.
  caps.add("view_attendance");
  caps.add("view_leave");

  if (session.permissions.includes("manage_payroll")) caps.add("manage_payroll");
  if (session.permissions.includes("manage_leave")) caps.add("manage_leave");
  if (session.permissions.includes("manage_company")) caps.add("manage_company");

  // Headcount views are generally available to people ops / company admins.
  if (session.permissions.includes("manage_employees") || session.permissions.includes("manage_company")) {
    caps.add("view_employee_directory");
  }

  // Reuse the backend payroll capability model (same role+permission semantics).
  const payrollCaps = resolvePayrollCapabilities({
    role: session.role ?? "employee",
    permissions: session.permissions
  } as Parameters<typeof resolvePayrollCapabilities>[0]);
  for (const capability of payrollCaps) {
    caps.add(capability);
  }

  // Platform owner should not receive company dashboard widgets.
  const dashboardCaps = resolveDashboardCapabilities(session);
  if (dashboardCaps.has("view_platform_owner_shell")) {
    return [];
  }

  return unique(caps);
};

export function canRenderWidget(
  userCapabilities: DashboardWidgetCapability[],
  widget: DashboardWidget
): boolean {
  const required = widgetCapabilityMap[widget];
  if (!required || required.length === 0) return false;

  const userSet = new Set<DashboardWidgetCapability>(userCapabilities);
  return required.some((capability) => userSet.has(capability));
}

export const getVisibleDashboardWidgets = (
  userCapabilities: DashboardWidgetCapability[]
): DashboardWidget[] => {
  return (Object.keys(widgetCapabilityMap) as DashboardWidget[]).filter((widget) =>
    canRenderWidget(userCapabilities, widget)
  );
};

export { widgetCapabilityMap };
