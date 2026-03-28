import type { AuthContext } from "./types";

export type PayrollCapability =
  | "view_own_payslip"
  | "view_all_payslips"
  | "view_payroll_runs"
  | "view_payroll_entries"
  | "view_payroll_summary"
  | "view_payroll_analytics"
  | "initiate_payroll_run"
  | "mark_payroll_paid"
  | "archive_payroll_run"
  | "modify_payroll_before_lock"
  | "unlock_payroll"
  | "view_payroll_audit";

/**
 * Payroll Capability Matrix (read-only + mutation semantics)
 *
 * Capability model is intentionally centralized here so services do not rely on
 * scattered role-string checks. Service methods must call `hasCapability()` /
 * `requirePayrollCapability()` and continue enforcing tenant scoping via
 * `ctx.companyId` + RLS.
 *
 * Logical roles (normalized from `ctx.role`) map to capabilities:
 *
 * EMPLOYEE:
 *   - view_own_payslip
 *
 * HR:
 *   - view_all_payslips
 *   - view_payroll_runs
 *   - view_payroll_entries
 *   - view_payroll_summary
 *   - initiate_payroll_run
 *   - mark_payroll_paid
 *   - archive_payroll_run
 *
 * ADMIN:
 *   - all HR capabilities
 *   - modify_payroll_before_lock
 *
 * FOUNDER / CEO:
 *   - view_payroll_runs
 *   - view_payroll_entries
 *   - view_payroll_summary
 *   - view_payroll_analytics
 *   - view_payroll_audit
 *   - no mutation capabilities
 *
 * PLATFORM_OWNER:
 *   - no company-route payroll capabilities (must never access tenant payroll
 *     data via normal company-scoped routes)
 *
 * Notes:
 * - Existing permission keys are used as primary compatibility signals.
 * - `manage_payroll` maps to HR-level payroll capabilities.
 * - `manage_company` maps to founder/admin-style read capabilities only.
 * - `ctx.role` is normalized only inside this helper (not in service methods).
 */

const normalizeRole = (role: string | null | undefined): string => {
  return (role ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/\//g, "_");
};

const FINANCE_ROLE_ALIASES = new Set(["finance", "finance_manager", "finance_admin", "finance_lead"]);
const EXECUTIVE_ROLE_ALIASES = new Set(["founder", "ceo", "founder_ceo", "ceo_founder", "org_owner", "org owner", "executive", "leadership"]);

const addMany = (target: Set<PayrollCapability>, capabilities: PayrollCapability[]) => {
  for (const capability of capabilities) target.add(capability);
};

const HR_CAPABILITIES: PayrollCapability[] = [
  "view_all_payslips",
  "view_payroll_runs",
  "view_payroll_entries",
  "view_payroll_summary",
  "initiate_payroll_run",
  "mark_payroll_paid",
  "archive_payroll_run"
];

const ADMIN_EXTRA_CAPABILITIES: PayrollCapability[] = [
  "modify_payroll_before_lock"
];

const FOUNDER_CAPABILITIES: PayrollCapability[] = [
  "view_payroll_runs",
  "view_payroll_entries",
  "view_payroll_summary",
  "view_payroll_analytics",
  "view_payroll_audit"
];

export const resolvePayrollCapabilities = (ctx: AuthContext): Set<PayrollCapability> => {
  const capabilities = new Set<PayrollCapability>();
  const role = normalizeRole(ctx.role);

  // Company routes must not honor platform-owner access.
  if (role === "platform_owner" || role === "platformadmin" || role === "platform_admin" || role === "super_admin") {
    return capabilities;
  }

  // Base employee self capability for authenticated company users.
  capabilities.add("view_own_payslip");

  // Compatibility mapping from current permission model.
  if (ctx.permissions.includes("manage_payroll")) {
    addMany(capabilities, HR_CAPABILITIES);
  }

  if (
    ctx.permissions.includes("manage_salary")
    || ctx.permissions.includes("approve_salary")
    || ctx.permissions.includes("run_payroll")
    || ctx.permissions.includes("finalize_payroll")
  ) {
    addMany(capabilities, HR_CAPABILITIES);
  }

  if (ctx.permissions.includes("manage_company")) {
    addMany(capabilities, FOUNDER_CAPABILITIES);
  }

  // Role normalization mapping (centralized here, not in services).
  if (role === "hr") {
    addMany(capabilities, HR_CAPABILITIES);
  }

  if (role === "admin") {
    addMany(capabilities, HR_CAPABILITIES);
    addMany(capabilities, ADMIN_EXTRA_CAPABILITIES);
  }

  if (FINANCE_ROLE_ALIASES.has(role)) {
    addMany(capabilities, HR_CAPABILITIES);
  }

  if (EXECUTIVE_ROLE_ALIASES.has(role)) {
    addMany(capabilities, FOUNDER_CAPABILITIES);
  }

  if (role === "employee") {
    capabilities.add("view_own_payslip");
  }

  return capabilities;
};

export const hasCapability = (ctx: AuthContext, capabilityName: PayrollCapability): boolean => {
  return resolvePayrollCapabilities(ctx).has(capabilityName);
};

export const requirePayrollCapability = (ctx: AuthContext, capabilityName: PayrollCapability): void => {
  if (!hasCapability(ctx, capabilityName)) {
    throw new Error("Permission denied");
  }
};
