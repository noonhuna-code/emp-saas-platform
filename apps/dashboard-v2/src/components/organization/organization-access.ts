export const ORG_PERMISSION_KEYS = [
  "manage_employees",
  "manage_org_structure",
  "manage_positions",
  "manage_reporting_lines",
  "manage_delegations",
  "manage_approval_routing",
] as const;

export type OrganizationCapabilityKey = (typeof ORG_PERMISSION_KEYS)[number];

export type OrganizationCapabilities = {
  roleLabel: string;
  canReadOrganization: boolean;
  canManageEmployees: boolean;
  canManageStructure: boolean;
  canManagePositions: boolean;
  canManageReportingLines: boolean;
  canManageDelegations: boolean;
  canManageApprovalRouting: boolean;
  canViewOverview: boolean;
  canViewExplorer: boolean;
  canViewPeople: boolean;
  canViewOrgChart: boolean;
  isReadOnly: boolean;
  isExecutive: boolean;
  isManagerial: boolean;
  canUseScopedReaderExperience: boolean;
};

const normalizeRole = (role?: string | null) => role?.trim().toLowerCase() ?? "";

const prettifyRole = (role?: string | null): string => {
  if (!role) return "Organization viewer";
  const normalized = role.replace(/[_-]+/g, " ").trim();
  if (!normalized) return "Organization viewer";
  return normalized.replace(/\b\w/g, (value) => value.toUpperCase());
};

export const getOrganizationCapabilities = (
  role: string | null | undefined,
  permissions: string[] | null | undefined
): OrganizationCapabilities => {
  const permissionSet = new Set(permissions ?? []);
  const normalizedRole = normalizeRole(role);

  const canManageEmployees = permissionSet.has("manage_employees");
  const canManageStructure = permissionSet.has("manage_org_structure");
  const canManagePositions = permissionSet.has("manage_positions");
  const canManageReportingLines = permissionSet.has("manage_reporting_lines");
  const canManageDelegations = permissionSet.has("manage_delegations");
  const canManageApprovalRouting = permissionSet.has("manage_approval_routing");

  const isExecutive =
    normalizedRole.includes("executive") ||
    normalizedRole.includes("founder") ||
    normalizedRole.includes("owner") ||
    normalizedRole.includes("ceo");

  const isManagerial =
    normalizedRole.includes("manager") ||
    normalizedRole.includes("lead") ||
    normalizedRole.includes("supervisor");

  const canUseScopedReaderExperience =
    isManagerial ||
    normalizedRole === "hr" ||
    normalizedRole === "finance" ||
    normalizedRole === "it" ||
    isExecutive;

  const canReadOrganization =
    canManageEmployees ||
    canManageStructure ||
    canManagePositions ||
    canManageReportingLines ||
    canManageDelegations ||
    canManageApprovalRouting ||
    canUseScopedReaderExperience;

  const isReadOnly =
    canUseScopedReaderExperience &&
    !canManageEmployees &&
    !canManageStructure &&
    !canManagePositions &&
    !canManageApprovalRouting;

  return {
    roleLabel: prettifyRole(role),
    canReadOrganization,
    canManageEmployees,
    canManageStructure,
    canManagePositions,
    canManageReportingLines,
    canManageDelegations,
    canManageApprovalRouting,
    canViewOverview: canReadOrganization,
    canViewExplorer: canManageEmployees || canManageStructure || canManagePositions || canManageApprovalRouting,
    canViewPeople: canReadOrganization,
    canViewOrgChart: canReadOrganization,
    isReadOnly,
    isExecutive,
    isManagerial,
    canUseScopedReaderExperience,
  };
};
