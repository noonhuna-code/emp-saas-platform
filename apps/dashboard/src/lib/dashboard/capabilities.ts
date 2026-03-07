export type DashboardCapability =
  | "view_employee_dashboard"
  | "view_manager_dashboard"
  | "view_teamlead_dashboard"
  | "view_hr_dashboard"
  | "view_admin_dashboard"
  | "view_it_dashboard"
  | "view_founder_dashboard"
  | "view_finance_dashboard"
  | "view_platform_owner_shell"
  | "view_payroll_workspace"
  | "view_monitoring_summary"
  | "view_people_ops"
  | "view_team_ops"
  | "view_security_summary";

export type DashboardPersona =
  | "employee"
  | "manager"
  | "team_lead"
  | "hr"
  | "it"
  | "admin"
  | "founder"
  | "finance"
  | "platform_owner";

type SessionShape = {
  role: string | null;
  permissions: string[];
};

/**
 * Dashboard capability matrix (frontend routing/composition only)
 *
 * This helper centralizes persona selection and widget visibility logic for
 * dashboard rendering. It is NOT an authorization layer. Backend services and
 * API routes remain the enforcement point.
 */

const normalizeRole = (role: string | null): string => {
  return (role ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
    .replace(/\//g, "_");
};

const addMany = (set: Set<DashboardCapability>, items: DashboardCapability[]) => {
  for (const item of items) set.add(item);
};

const EMPLOYEE_CAPS: DashboardCapability[] = ["view_employee_dashboard"];
const TEAMLEAD_CAPS: DashboardCapability[] = ["view_teamlead_dashboard", "view_team_ops"];
const MANAGER_CAPS: DashboardCapability[] = ["view_manager_dashboard", "view_team_ops", "view_people_ops"];
const HR_CAPS: DashboardCapability[] = ["view_hr_dashboard", "view_payroll_workspace", "view_people_ops"];
const IT_CAPS: DashboardCapability[] = ["view_it_dashboard", "view_monitoring_summary", "view_security_summary"];
const ADMIN_CAPS: DashboardCapability[] = ["view_admin_dashboard", "view_monitoring_summary", "view_security_summary", "view_people_ops", "view_payroll_workspace"];
const FOUNDER_CAPS: DashboardCapability[] = ["view_founder_dashboard", "view_monitoring_summary", "view_security_summary", "view_payroll_workspace", "view_people_ops"];
const FINANCE_CAPS: DashboardCapability[] = ["view_finance_dashboard", "view_payroll_workspace"];
const PLATFORM_OWNER_CAPS: DashboardCapability[] = ["view_platform_owner_shell"];

const IT_ROLE_ALIASES = new Set(["it", "it_manager", "it_admin", "it_support"]);
const FINANCE_ROLE_ALIASES = new Set(["finance", "finance_manager", "finance_admin", "finance_lead"]);

export const resolveDashboardCapabilities = (session: SessionShape): Set<DashboardCapability> => {
  const capabilities = new Set<DashboardCapability>();
  const role = normalizeRole(session.role);
  const permissions = new Set(session.permissions);

  addMany(capabilities, EMPLOYEE_CAPS);

  if (permissions.has("manage_attendance")) addMany(capabilities, TEAMLEAD_CAPS);
  if (permissions.has("manage_employees")) addMany(capabilities, MANAGER_CAPS);
  if (permissions.has("manage_payroll")) addMany(capabilities, HR_CAPS);
  if (permissions.has("manage_company")) addMany(capabilities, ADMIN_CAPS);
  if (permissions.has("manage_company")) addMany(capabilities, FOUNDER_CAPS);
  if (permissions.has("manage_billing") || permissions.has("approve_billing_payments") || permissions.has("view_billing")) {
    addMany(capabilities, FINANCE_CAPS);
  }

  if (role === "team_lead" || role === "teamlead") addMany(capabilities, TEAMLEAD_CAPS);
  if (role === "manager") addMany(capabilities, MANAGER_CAPS);
  if (role === "hr") addMany(capabilities, HR_CAPS);
  if (IT_ROLE_ALIASES.has(role)) addMany(capabilities, IT_CAPS);
  if (FINANCE_ROLE_ALIASES.has(role)) addMany(capabilities, FINANCE_CAPS);
  if (role === "admin") addMany(capabilities, ADMIN_CAPS);
  if (role === "founder" || role === "ceo" || role === "founder_ceo" || role === "ceo_founder") addMany(capabilities, FOUNDER_CAPS);
  if (
    role === "platform_owner"
    || role === "platformadmin"
    || role === "platform_admin"
    || role === "super_admin"
    || permissions.has("view_all_companies")
    || permissions.has("view_global_audit")
  ) {
    capabilities.clear();
    addMany(capabilities, PLATFORM_OWNER_CAPS);
  }

  return capabilities;
};

export const resolveDashboardPersona = (session: SessionShape): DashboardPersona => {
  const role = normalizeRole(session.role);
  const permissions = new Set(session.permissions);
  const caps = resolveDashboardCapabilities(session);

  if (
    caps.has("view_platform_owner_shell")
    || role === "platform_owner"
    || role === "platform_admin"
    || role === "super_admin"
    || permissions.has("view_all_companies")
    || permissions.has("view_global_audit")
  ) {
    return "platform_owner";
  }
  if (IT_ROLE_ALIASES.has(role) || caps.has("view_it_dashboard")) return "it";
  if (role === "founder" || role === "ceo" || caps.has("view_founder_dashboard")) return "founder";
  if (role === "admin") return "admin";
  if (role === "hr" || (caps.has("view_hr_dashboard") && !caps.has("view_manager_dashboard") && !caps.has("view_admin_dashboard"))) return "hr";
  if (FINANCE_ROLE_ALIASES.has(role)) return "finance";
  if (role === "team_lead" || role === "teamlead") return "team_lead";
  if (caps.has("view_manager_dashboard")) return "manager";
  if (caps.has("view_teamlead_dashboard")) return "team_lead";
  if (caps.has("view_finance_dashboard") && !caps.has("view_hr_dashboard") && !caps.has("view_admin_dashboard") && !caps.has("view_founder_dashboard")) {
    return "finance";
  }
  return "employee";
};

export const hasDashboardCapability = (session: SessionShape, capability: DashboardCapability): boolean => {
  return resolveDashboardCapabilities(session).has(capability);
};
