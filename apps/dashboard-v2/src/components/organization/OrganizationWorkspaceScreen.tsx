"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  OrgPositionStatus,
  OrganizationAdminData,
  OrganizationOverview,
  OrgReportingRelationType,
  OrgUnitCategory,
  OrgUnitStatus,
  PositionAssignmentType,
  PositionRelationType,
} from "@emp/lib/types";
import {
  type EmployeeAccessExplanation,
  type OrgUnitAccessExplanation,
  fetchEmployeeAccessExplanation,
  fetchOrgUnitAccessExplanation,
  fetchOrganizationAdminData,
  fetchOrganizationOverview,
  mutateOrganizationAdmin,
} from "@/lib/client/api";
import {
  AdminField,
  AdminGrid,
  AdminInlineMessage,
  AdminTable,
  AdminTabs,
  adminCheckboxClassName,
  adminInputClassName,
  adminTextAreaClassName,
} from "./OrganizationAdminPrimitives";
import { DashboardRail, FeatureCallout, OverviewChips, PageContainer, PageHeader, StatePanel, StatCard, StatGrid, SurfacePanel, WorkspaceModuleGrid } from "@/components/dashboard-v2/PagePrimitives";
import { OrganizationOverviewScreen } from "./OrganizationOverviewScreen";
import { OrganizationSectionNav } from "./OrganizationSectionNav";
import { getOrganizationCapabilities } from "./organization-access";
import { buildPublicWebsiteUrl } from "@/lib/site";

type TabId = "overview" | "structure" | "roles" | "assignments" | "approvals" | "explorer";

type SelectValue = { label: string; value: string };

const TAB_BY_ID: Record<TabId, { id: TabId; label: string }> = {
  overview: { id: "overview", label: "Overview" },
  structure: { id: "structure", label: "Structure" },
  roles: { id: "roles", label: "Roles & Positions" },
  assignments: { id: "assignments", label: "Assignments & Reporting" },
  approvals: { id: "approvals", label: "Approvals & Delegation" },
  explorer: { id: "explorer", label: "Explorer" },
};

const TAB_COPY: Record<TabId, { title: string; description: string }> = {
  overview: {
    title: "Organization overview",
    description: "Read structure, reporting, and foundation coverage before opening deeper admin controls.",
  },
  structure: {
    title: "Structure management",
    description: "Create and maintain org unit types and the enterprise hierarchy in a controlled lane.",
  },
  roles: {
    title: "Roles and positions",
    description: "Manage role families, job roles, positions, and structural authority relationships.",
  },
  assignments: {
    title: "Assignments and reporting",
    description: "Connect people to positions and reporting lines without losing future-dated planning context.",
  },
  approvals: {
    title: "Approvals and delegation",
    description: "Control approval delegation and routing ownership across org, role, and employee context.",
  },
  explorer: {
    title: "Explorer and audit context",
    description: "Search the organization model and assignment snapshot with scoped filters and relationship context.",
  },
};

const UNIT_CATEGORIES: OrgUnitCategory[] = ["ownership", "business", "geography", "functional", "workspace", "temporary"];
const UNIT_STATUSES: OrgUnitStatus[] = ["draft", "active", "inactive", "archived"];
const POSITION_STATUSES: OrgPositionStatus[] = ["planned", "active", "inactive", "archived"];
const POSITION_ASSIGNMENT_TYPES: PositionAssignmentType[] = [
  "primary",
  "secondary",
  "dotted_line",
  "acting",
  "delegated_approver",
  "temporary_project",
];
const POSITION_RELATION_TYPES: PositionRelationType[] = [
  "primary_manager",
  "dotted_line_manager",
  "secondary_manager",
  "acting_manager",
  "skip_level_manager",
  "functional_manager",
  "delegate_approver",
  "approval_escalation",
  "project_manager",
];
const REPORTING_RELATION_TYPES: OrgReportingRelationType[] = [
  "direct_manager",
  "dotted_line",
  "senior_manager",
  "team_lead",
  "hr_manager",
  "payroll_reviewer",
  "project_manager",
  "secondary_manager",
  "acting_manager",
  "delegate_approver",
  "skip_level_manager",
  "functional_manager",
  "approval_manager",
  "matrix_manager",
];

const emptyOrgUnitTypeForm = () => ({
  id: "",
  key: "",
  name: "",
  category: "functional" as OrgUnitCategory,
  description: "",
  allows_people_assignment: true,
  allows_children: true,
  sort_order: "500",
  is_active: true,
});

const emptyOrgUnitForm = () => ({
  id: "",
  unit_type_key: "",
  name: "",
  code: "",
  parent_org_unit_id: "",
  status: "active" as OrgUnitStatus,
  is_active: true,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
});

const emptyRoleFamilyForm = () => ({
  id: "",
  key: "",
  name: "",
  description: "",
  sort_order: "500",
});

const emptyJobRoleForm = () => ({
  id: "",
  role_family_id: "",
  title: "",
  code: "",
  grade_band: "",
  level_code: "",
  employment_type: "",
  management_scope: "individual_contributor",
  is_executive: false,
  supervisor_eligible: false,
  approver_eligible: false,
  delegate_eligible: false,
});

const emptyPositionForm = () => ({
  id: "",
  org_unit_id: "",
  job_role_id: "",
  position_code: "",
  title_override: "",
  reports_to_position_id: "",
  status: "active" as OrgPositionStatus,
  is_key_position: false,
  is_people_manager: false,
  is_approver_position: false,
  headcount_limit: "",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
});

const emptyPositionRelationshipForm = () => ({
  id: "",
  from_position_id: "",
  to_position_id: "",
  relation_type: "primary_manager" as PositionRelationType,
  is_primary: false,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
});

const emptyAssignmentForm = () => ({
  id: "",
  employee_id: "",
  position_id: "",
  assignment_type: "primary" as PositionAssignmentType,
  is_primary: false,
  allocation_percent: "100",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
});

const emptyReportingLineForm = () => ({
  id: "",
  employee_id: "",
  manager_employee_id: "",
  relation_type: "direct_manager" as OrgReportingRelationType,
  is_primary: false,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
});

const emptyDelegationForm = () => ({
  id: "",
  delegator_employee_id: "",
  delegate_employee_id: "",
  position_id: "",
  org_unit_id: "",
  module_key: "",
  request_type: "",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
  is_active: true,
  notes: "",
});

const emptyRoutingRuleForm = () => ({
  id: "",
  rule_name: "",
  module_key: "",
  request_type: "",
  subject_org_unit_id: "",
  subject_geo_org_unit_id: "",
  subject_role_family_id: "",
  subject_job_role_id: "",
  subject_grade_band: "",
  approver_position_id: "",
  approver_employee_id: "",
  delegate_employee_id: "",
  step_order: "1",
  is_required: true,
  is_active: true,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: "",
});

const toInputDate = (value?: string | null): string => (value ? value.slice(0, 10) : "");

const formatBool = (value: boolean): string => (value ? "Yes" : "No");

const filterBySearch = (value: string, search: string): boolean =>
  !search || value.toLowerCase().includes(search.trim().toLowerCase());

const buildDescendantSet = (rows: OrganizationAdminData["directory"], rootId: string): Set<string> => {
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parent_org_unit_id) continue;
    const bucket = childrenByParent.get(row.parent_org_unit_id) ?? [];
    bucket.push(row.id);
    childrenByParent.set(row.parent_org_unit_id, bucket);
  }
  const visited = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenByParent.get(current) ?? []) {
      if (visited.has(child)) continue;
      visited.add(child);
      queue.push(child);
    }
  }
  return visited;
};

const labelOptions = (values: Array<{ id: string; label: string; secondary_label?: string | null }>): SelectValue[] =>
  values.map((value) => ({
    value: value.id,
    label: value.secondary_label ? `${value.label} - ${value.secondary_label}` : value.label,
  }));

const SelectField = ({
  value,
  onChange,
  options,
  placeholder = "Select",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectValue[];
  placeholder?: string;
}) => (
  <select className={adminInputClassName} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

const CheckboxField = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) => (
  <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
    <input
      className={adminCheckboxClassName}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span>{label}</span>
  </label>
);

const EmptyHint = ({ title, description }: { title: string; description: string }) => (
  <StatePanel title={title} description={description} />
);

const AccessExplanationCard = ({
  title,
  allowed,
  broadAccess,
  reasons,
  emptyMessage,
}: {
  title: string;
  allowed?: boolean;
  broadAccess?: boolean;
  reasons?: Array<{
    code: string;
    label: string;
    source: "broad_permission" | "derived" | "explicit" | "context";
    detail?: string;
    relationType?: string | null;
    scopeType?: string | null;
    inherited?: boolean;
  }>;
  emptyMessage: string;
}) => {
  if (!reasons) {
    return <StatePanel title={title} description={emptyMessage} className="border-dashed" />;
  }

  return (
    <StatePanel
      title={title}
      description={
        allowed
          ? "This record is currently visible through the verified org access model."
          : "This record is intentionally outside the current user’s verified scope."
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={allowed ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>
          {allowed ? "Visible" : "Denied"}
        </Badge>
        <Badge className="border-slate-200 bg-white text-slate-700">
          {broadAccess ? "Broad org read" : "Scoped org read"}
        </Badge>
      </div>
      {reasons.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {reasons.map((reason) => (
            <div key={`${reason.code}-${reason.label}-${reason.detail ?? ""}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{reason.label}</p>
                <Badge className="border-slate-200 bg-white text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  {reason.source.replace("_", " ")}
                </Badge>
                {reason.scopeType ? (
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">{reason.scopeType}</Badge>
                ) : null}
                {reason.relationType ? (
                  <Badge className="border-violet-200 bg-violet-50 text-violet-700">{reason.relationType}</Badge>
                ) : null}
                {reason.inherited ? (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">Inherited</Badge>
                ) : null}
              </div>
              {reason.detail ? <p className="mt-2 text-sm leading-6 text-slate-600">{reason.detail}</p> : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">No matching access reasons were returned for this record.</p>
      )}
    </StatePanel>
  );
};

export function OrganizationWorkspaceScreen({
  initialOverview,
  initialAdminData,
  initialError,
  viewerRole,
  viewerPermissions,
  viewerEmployeeId,
}: {
  initialOverview: OrganizationOverview | null;
  initialAdminData: OrganizationAdminData | null;
  initialError?: string | null;
  viewerRole: string | null;
  viewerPermissions: string[];
  viewerEmployeeId?: string | null;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [overview, setOverview] = useState<OrganizationOverview | null>(initialOverview);
  const [adminData, setAdminData] = useState<OrganizationAdminData | null>(initialAdminData);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [loading, setLoading] = useState(false);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [orgUnitTypeForm, setOrgUnitTypeForm] = useState(emptyOrgUnitTypeForm);
  const [orgUnitForm, setOrgUnitForm] = useState(emptyOrgUnitForm);
  const [roleFamilyForm, setRoleFamilyForm] = useState(emptyRoleFamilyForm);
  const [jobRoleForm, setJobRoleForm] = useState(emptyJobRoleForm);
  const [positionForm, setPositionForm] = useState(emptyPositionForm);
  const [positionRelationshipForm, setPositionRelationshipForm] = useState(emptyPositionRelationshipForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [reportingLineForm, setReportingLineForm] = useState(emptyReportingLineForm);
  const [delegationForm, setDelegationForm] = useState(emptyDelegationForm);
  const [routingRuleForm, setRoutingRuleForm] = useState(emptyRoutingRuleForm);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [directoryCategoryFilter, setDirectoryCategoryFilter] = useState("");
  const [directoryStatusFilter, setDirectoryStatusFilter] = useState("");
  const [directoryTypeFilter, setDirectoryTypeFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [officeFilter, setOfficeFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [roleFamilyFilter, setRoleFamilyFilter] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [managerFilter, setManagerFilter] = useState("");
  const [employeeAccessId, setEmployeeAccessId] = useState("");
  const [orgUnitAccessId, setOrgUnitAccessId] = useState("");
  const [employeeAccessState, setEmployeeAccessState] = useState<{
    loading: boolean;
    error: string | null;
    data: EmployeeAccessExplanation | null;
  }>({ loading: false, error: null, data: null });
  const [orgUnitAccessState, setOrgUnitAccessState] = useState<{
    loading: boolean;
    error: string | null;
    data: OrgUnitAccessExplanation | null;
  }>({ loading: false, error: null, data: null });
  const capabilities = useMemo(
    () => getOrganizationCapabilities(viewerRole, viewerPermissions),
    [viewerPermissions, viewerRole]
  );

  const refreshAll = async () => {
    setLoading(true);
    setError(null);
    const [overviewResult, adminResult] = await Promise.all([fetchOrganizationOverview(), fetchOrganizationAdminData()]);
    if (!overviewResult.ok || !overviewResult.data) {
      setError(overviewResult.error ?? "Unable to refresh organization overview");
    } else {
      setOverview(overviewResult.data);
    }
    if (!adminResult.ok || !adminResult.data) {
      setError(adminResult.error ?? "Unable to refresh organization admin data");
    } else {
      setAdminData(adminResult.data);
    }
    setLoading(false);
  };

  const submitMutation = async (
    resource: string,
    action: "save" | "archive" | "restore" | "delete",
    payload: Record<string, unknown>,
    successMessage: string
  ) => {
    setMutationError(null);
    setMutationMessage(null);
    const result = await mutateOrganizationAdmin({ resource, action, payload });
    if (!result.ok) {
      if (result.error === "Authentication required") {
        window.location.href = buildPublicWebsiteUrl("/sign-in", { next: "/app/organization" });
        return;
      }
      if (result.error === "Permission denied") {
        window.location.href = "/403";
        return;
      }
      setMutationError(result.error ?? "Organization admin mutation failed");
      return;
    }
    setMutationMessage(successMessage);
    await refreshAll();
  };

  const lookups = adminData?.lookups;
  const orgUnitOptions = useMemo(() => labelOptions(lookups?.org_units ?? []), [lookups?.org_units]);
  const employeeOptions = useMemo(() => labelOptions(lookups?.employees ?? []), [lookups?.employees]);
  const roleFamilyOptions = useMemo(() => labelOptions(lookups?.role_families ?? []), [lookups?.role_families]);
  const jobRoleOptions = useMemo(() => labelOptions(lookups?.job_roles ?? []), [lookups?.job_roles]);
  const positionOptions = useMemo(() => labelOptions(lookups?.positions ?? []), [lookups?.positions]);

  const cities = useMemo(
    () =>
      (adminData?.directory ?? [])
        .filter((row) => row.unit_type_key === "city")
        .map((row) => ({ value: row.id, label: row.name })),
    [adminData?.directory]
  );
  const offices = useMemo(
    () =>
      (adminData?.directory ?? [])
        .filter((row) => ["office", "site", "branch"].includes(row.unit_type_key))
        .map((row) => ({ value: row.id, label: `${row.name} (${row.unit_type_key})` })),
    [adminData?.directory]
  );
  const departments = useMemo(
    () =>
      (adminData?.directory ?? [])
        .filter((row) => ["department", "sub_department"].includes(row.unit_type_key))
        .map((row) => ({ value: row.id, label: row.name })),
    [adminData?.directory]
  );
  const teams = useMemo(
    () =>
      (adminData?.directory ?? [])
        .filter((row) => ["team", "sub_team", "pod"].includes(row.unit_type_key))
        .map((row) => ({ value: row.id, label: row.name })),
    [adminData?.directory]
  );

  const filterRoots = [cityFilter, officeFilter, departmentFilter, teamFilter].filter(Boolean);
  const allowedOrgUnitIds = useMemo(() => {
    if (!adminData || filterRoots.length === 0) return null;
    const sets = filterRoots.map((rootId) => buildDescendantSet(adminData.directory, rootId));
    return sets.reduce((acc, current) => {
      if (!acc) return current;
      return new Set(Array.from(acc).filter((value) => current.has(value)));
    }, null as Set<string> | null);
  }, [adminData, filterRoots, cityFilter, officeFilter, departmentFilter, teamFilter]);

  const filteredDirectory = useMemo(() => {
    if (!adminData) return [];
    return adminData.directory.filter((row) => {
      if (directoryCategoryFilter && row.unit_category !== directoryCategoryFilter) return false;
      if (directoryStatusFilter && row.status !== directoryStatusFilter) return false;
      if (directoryTypeFilter && row.unit_type_key !== directoryTypeFilter) return false;
      if (allowedOrgUnitIds && !allowedOrgUnitIds.has(row.id) && !(row.parent_org_unit_id && allowedOrgUnitIds.has(row.parent_org_unit_id))) {
        return false;
      }
      return filterBySearch(
        [row.name, row.code, row.unit_type_name, row.parent_org_unit_name].filter(Boolean).join(" "),
        explorerSearch
      );
    });
  }, [adminData, directoryCategoryFilter, directoryStatusFilter, directoryTypeFilter, allowedOrgUnitIds, explorerSearch]);

  const filteredAssignmentSnapshot = useMemo(() => {
    if (!adminData) return [];
    const selectedRoleFamilyKey = roleFamilyFilter
      ? adminData.role_families.find((row) => row.id === roleFamilyFilter)?.key ?? ""
      : "";
    const employeeIdsForManager = managerFilter
      ? new Set(
          adminData.reporting_lines
            .filter((row) => row.manager_employee_id === managerFilter)
            .map((row) => row.employee_id)
        )
      : null;
    return adminData.assignment_snapshot.filter((row) => {
      if (allowedOrgUnitIds && !allowedOrgUnitIds.has(row.org_unit_id)) return false;
      if (selectedRoleFamilyKey && row.role_family_key !== selectedRoleFamilyKey) return false;
      if (positionFilter && row.position_id !== positionFilter) return false;
      if (employeeIdsForManager && !employeeIdsForManager.has(row.employee_id)) return false;
      return filterBySearch(
        [row.employee_name, row.employee_code, row.position_title, row.org_unit_name, row.role_family_name].filter(Boolean).join(" "),
        explorerSearch
      );
    });
  }, [adminData, allowedOrgUnitIds, roleFamilyFilter, positionFilter, managerFilter, explorerSearch]);

  const visibleTabs = useMemo<Array<{ id: TabId; label: string }>>(() => {
    const next: Array<{ id: TabId; label: string }> = [];
    if (capabilities.canViewOverview && overview) next.push(TAB_BY_ID.overview);
    if (adminData && capabilities.canManageStructure) next.push(TAB_BY_ID.structure);
    if (adminData && capabilities.canManagePositions) next.push(TAB_BY_ID.roles);
    if (adminData && (capabilities.canManageEmployees || capabilities.canManagePositions)) next.push(TAB_BY_ID.assignments);
    if (adminData && (capabilities.canManageEmployees || capabilities.canManageApprovalRouting)) next.push(TAB_BY_ID.approvals);
    if (adminData && capabilities.canViewExplorer) next.push(TAB_BY_ID.explorer);
    return next;
  }, [adminData, capabilities, overview]);
  const activeTabCopy = TAB_COPY[tab];
  const topModules = useMemo(
    () =>
      [
        capabilities.canReadOrganization
          ? {
              title: "Organization workspace",
              description: "Stay in the main organization control surface for structure, reporting, and governance changes.",
              href: "/app/organization",
              label: "Workspace",
              metric: visibleTabs.length ? `${visibleTabs.length} sections` : "Overview",
              highlights: ["Structure", "Reporting", "Governance"],
            }
          : null,
        capabilities.canViewPeople
          ? {
              title: "People directory",
              description: "Switch to the readable directory view when employee search and reporting context matter more than admin forms.",
              href: "/app/people",
              label: "People",
              metric: overview ? `${overview.employees.length} employees` : "Directory",
              highlights: ["Profiles", "Managers", "Role families"],
            }
          : null,
        capabilities.canViewOrgChart
          ? {
              title: "Org chart view",
              description: "Open the relationship-first view when reporting paths and placement need a cleaner visual read.",
              href: "/app/org-chart",
              label: "Org chart",
              metric: overview ? `${overview.teams.length} teams` : "Relationships",
              highlights: ["Managers", "Placement", "Relationships"],
            }
          : null,
        {
          title: "Dashboard return",
          description: "Jump back to the role dashboard after reviewing organization context or completing admin work.",
          href: "/app/dashboard",
          label: "Navigation",
          highlights: ["Role home", "Workspace", "Follow-up"],
        },
      ].filter(Boolean),
    [capabilities.canReadOrganization, capabilities.canViewOrgChart, capabilities.canViewPeople, overview, visibleTabs.length]
  ) as Array<{ title: string; description: string; href: string; label?: string; metric?: string; highlights?: string[] }>;
  const summaryChips = [
    capabilities.isReadOnly ? "Read-safe organization view" : "Admin-capable organization view",
    activeTabCopy.title,
    `${visibleTabs.length} visible sections`,
    overview ? `${overview.departments.length} departments` : "Overview pending",
    adminData?.identity_reference_strategy ?? "Profile-backed identity",
  ];
  const summaryStats = [
    {
      label: "Visible sections",
      value: visibleTabs.length,
      hint: "Workspace tabs available to the current role",
    },
    {
      label: "Departments",
      value: overview?.departments.length ?? 0,
      hint: "Current structure visible in organization scope",
    },
    {
      label: "Teams",
      value: overview?.teams.length ?? 0,
      hint: "Execution units currently visible",
    },
    {
      label: "Explorer rows",
      value: adminData?.assignment_snapshot.length ?? 0,
      hint: capabilities.canViewExplorer ? "Assignment snapshot rows returned" : "Explorer hidden for this role",
    },
  ];

  useEffect(() => {
    const firstVisibleTab = visibleTabs[0];
    if (!firstVisibleTab) return;
    if (!visibleTabs.some((entry) => entry.id === tab)) {
      setTab(firstVisibleTab.id);
    }
  }, [tab, visibleTabs]);

  useEffect(() => {
    if (!employeeAccessId && employeeOptions[0]?.value) {
      setEmployeeAccessId(employeeOptions[0].value);
    }
  }, [employeeAccessId, employeeOptions]);

  useEffect(() => {
    if (!orgUnitAccessId && orgUnitOptions[0]?.value) {
      setOrgUnitAccessId(orgUnitOptions[0].value);
    }
  }, [orgUnitAccessId, orgUnitOptions]);

  const inspectEmployeeAccess = async () => {
    if (!employeeAccessId) {
      setEmployeeAccessState({ loading: false, error: "Choose an employee to inspect.", data: null });
      return;
    }

    setEmployeeAccessState((current) => ({ ...current, loading: true, error: null }));
    const result = await fetchEmployeeAccessExplanation(employeeAccessId);
    if (!result.ok || !result.data) {
      setEmployeeAccessState({ loading: false, error: result.error ?? "Unable to inspect employee access.", data: null });
      return;
    }

    setEmployeeAccessState({ loading: false, error: null, data: result.data });
  };

  const inspectOrgUnitAccess = async () => {
    if (!orgUnitAccessId) {
      setOrgUnitAccessState({ loading: false, error: "Choose an org unit to inspect.", data: null });
      return;
    }

    setOrgUnitAccessState((current) => ({ ...current, loading: true, error: null }));
    const result = await fetchOrgUnitAccessExplanation(orgUnitAccessId);
    if (!result.ok || !result.data) {
      setOrgUnitAccessState({ loading: false, error: result.error ?? "Unable to inspect org unit access.", data: null });
      return;
    }

    setOrgUnitAccessState({ loading: false, error: null, data: result.data });
  };

  if (!overview && !adminData && error) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Organization"
          title="Enterprise organization workspace"
          description="Organization data could not be loaded for the current workspace."
        />
        <StatePanel title="Unable to load organization workspace" description={error} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Organization"
        title="Enterprise organization workspace"
        description="Manage structure, positions, reporting, delegation, and people visibility from one role-aware organization surface."
        chips={[
          capabilities.isReadOnly ? "Read-safe" : "Admin capable",
          "Role-aware organization",
          viewerEmployeeId ? "Employee context ready" : "No employee context",
          adminData?.identity_reference_strategy ?? "Profile-backed identity",
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => void refreshAll()} disabled={loading}>
              {loading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        }
      />

      <OrganizationSectionNav capabilities={capabilities} className="mb-6" />

      <FeatureCallout
        badge={capabilities.isReadOnly ? "Scoped reader" : "Organization control"}
        title={activeTabCopy.title}
        description={activeTabCopy.description}
      />

      <StatGrid>
        {summaryStats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} hint={stat.hint} />
        ))}
      </StatGrid>

      <DashboardRail className="xl:grid-cols-[minmax(0,1fr)]">
        <SurfacePanel
          title="Workspace sections"
          description={
            capabilities.isReadOnly
              ? "Your current role can review the organization surface without seeing admin-only controls."
              : "Use the tabs below to manage structure, positions, reporting, delegations, and approvals from one place."
          }
        >
          <div className="space-y-4">
            <OverviewChips chips={summaryChips} />
            <AdminTabs value={tab} onChange={(value) => setTab(value as TabId)} tabs={visibleTabs} />
            {mutationMessage ? <AdminInlineMessage tone="success">{mutationMessage}</AdminInlineMessage> : null}
            {mutationError ? <AdminInlineMessage tone="error">{mutationError}</AdminInlineMessage> : null}
            {error ? <AdminInlineMessage tone="error">{error}</AdminInlineMessage> : null}
            {!capabilities.canViewOverview && !adminData ? (
              <AdminInlineMessage tone="muted">
                Organization data is currently limited for this role.
              </AdminInlineMessage>
            ) : null}
          </div>
        </SurfacePanel>

        <SurfacePanel
          title="Cross-workspace routes"
          description="Move between structure, people visibility, org chart context, and the main role dashboard without losing your current operating lane."
        >
          <WorkspaceModuleGrid className="xl:grid-cols-2" modules={topModules} />
        </SurfacePanel>

        {capabilities.canReadOrganization && adminData && !capabilities.isReadOnly ? (
          <SurfacePanel
            title="Access visibility inspector"
            description="Inspect the current verified scope model for employees and org units without widening permissions or touching write flows."
            tone="subtle"
          >
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-4">
                  <AdminField
                    label="Inspect employee visibility"
                    hint="Uses the explainability-aware employee access endpoint for the current session."
                  >
                    <SelectField
                      value={employeeAccessId}
                      onChange={(value) => {
                        setEmployeeAccessId(value);
                        setEmployeeAccessState({ loading: false, error: null, data: null });
                      }}
                      options={employeeOptions}
                      placeholder="Select an employee"
                    />
                  </AdminField>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void inspectEmployeeAccess()} disabled={employeeAccessState.loading}>
                      {employeeAccessState.loading ? "Inspecting..." : "Inspect employee scope"}
                    </Button>
                  </div>
                  {employeeAccessState.error ? <AdminInlineMessage tone="error">{employeeAccessState.error}</AdminInlineMessage> : null}
                  <AccessExplanationCard
                    title="Employee access explanation"
                    allowed={employeeAccessState.data?.allowed}
                    broadAccess={employeeAccessState.data?.broadAccess}
                    reasons={employeeAccessState.data?.reasons}
                    emptyMessage="Choose an employee to inspect why the current user can or cannot see that record."
                  />
                </div>

                <div className="space-y-4">
                  <AdminField
                    label="Inspect org-unit visibility"
                    hint="Uses the explainability-aware org-unit access endpoint for the current session."
                  >
                    <SelectField
                      value={orgUnitAccessId}
                      onChange={(value) => {
                        setOrgUnitAccessId(value);
                        setOrgUnitAccessState({ loading: false, error: null, data: null });
                      }}
                      options={orgUnitOptions}
                      placeholder="Select an org unit"
                    />
                  </AdminField>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={() => void inspectOrgUnitAccess()} disabled={orgUnitAccessState.loading}>
                      {orgUnitAccessState.loading ? "Inspecting..." : "Inspect org-unit scope"}
                    </Button>
                  </div>
                  {orgUnitAccessState.error ? <AdminInlineMessage tone="error">{orgUnitAccessState.error}</AdminInlineMessage> : null}
                  <AccessExplanationCard
                    title="Org-unit access explanation"
                    allowed={orgUnitAccessState.data?.allowed}
                    broadAccess={orgUnitAccessState.data?.broadAccess}
                    reasons={orgUnitAccessState.data?.reasons}
                    emptyMessage="Choose an org unit to inspect why the current user can or cannot see that part of the organization."
                  />
                </div>
              </div>
            </div>
          </SurfacePanel>
        ) : null}
      </DashboardRail>

      {tab === "overview" ? (
        <OrganizationOverviewScreen overview={overview} error={error} embedded viewerRole={viewerRole} viewerPermissions={viewerPermissions} />
      ) : null}

      {tab === "structure" ? (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <SurfacePanel title="Org unit type catalog" description="System types remain read-only. Add company-specific types only when your structure needs them.">
            <div className="space-y-5">
              <AdminGrid>
                <AdminField label="Type key">
                  <input
                    className={adminInputClassName}
                    value={orgUnitTypeForm.key}
                    onChange={(event) => setOrgUnitTypeForm((current) => ({ ...current, key: event.target.value }))}
                    placeholder="regional_hub"
                  />
                </AdminField>
                <AdminField label="Name">
                  <input
                    className={adminInputClassName}
                    value={orgUnitTypeForm.name}
                    onChange={(event) => setOrgUnitTypeForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Regional Hub"
                  />
                </AdminField>
                <AdminField label="Category">
                  <select
                    className={adminInputClassName}
                    value={orgUnitTypeForm.category}
                    onChange={(event) =>
                      setOrgUnitTypeForm((current) => ({ ...current, category: event.target.value as OrgUnitCategory }))
                    }
                  >
                    {UNIT_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Sort order">
                  <input
                    className={adminInputClassName}
                    type="number"
                    value={orgUnitTypeForm.sort_order}
                    onChange={(event) => setOrgUnitTypeForm((current) => ({ ...current, sort_order: event.target.value }))}
                  />
                </AdminField>
                <AdminField label="Description" className="md:col-span-2 xl:col-span-2">
                  <textarea
                    className={adminTextAreaClassName}
                    value={orgUnitTypeForm.description}
                    onChange={(event) => setOrgUnitTypeForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Short explanation for where this unit type should be used."
                  />
                </AdminField>
              </AdminGrid>
              <div className="grid gap-3 md:grid-cols-3">
                <CheckboxField
                  checked={orgUnitTypeForm.allows_people_assignment}
                  onChange={(value) =>
                    setOrgUnitTypeForm((current) => ({ ...current, allows_people_assignment: value }))
                  }
                  label="Allows people assignment"
                />
                <CheckboxField
                  checked={orgUnitTypeForm.allows_children}
                  onChange={(value) => setOrgUnitTypeForm((current) => ({ ...current, allows_children: value }))}
                  label="Allows child units"
                />
                <CheckboxField
                  checked={orgUnitTypeForm.is_active}
                  onChange={(value) => setOrgUnitTypeForm((current) => ({ ...current, is_active: value }))}
                  label="Active"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() =>
                    void submitMutation("org_unit_type", "save", orgUnitTypeForm as unknown as Record<string, unknown>, "Org unit type saved.")
                  }
                >
                  {orgUnitTypeForm.id ? "Update type" : "Create type"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOrgUnitTypeForm(emptyOrgUnitTypeForm())}>
                  Reset
                </Button>
              </div>
              {adminData?.org_unit_types?.length ? (
                <AdminTable headers={["Name", "Key", "Category", "Scope", "Children", "People", "Status", "Actions"]}>
                  {adminData.org_unit_types.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">{row.key}</td>
                      <td className="px-4 py-3">{row.category}</td>
                      <td className="px-4 py-3">{row.is_system ? "System" : "Custom"}</td>
                      <td className="px-4 py-3">{formatBool(row.allows_children)}</td>
                      <td className="px-4 py-3">{formatBool(row.allows_people_assignment)}</td>
                      <td className="px-4 py-3">{row.is_active ? "Active" : "Inactive"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {!row.is_system ? (
                            <>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  setOrgUnitTypeForm({
                                    id: row.id,
                                    key: row.key,
                                    name: row.name,
                                    category: row.category,
                                    description: row.description ?? "",
                                    allows_people_assignment: row.allows_people_assignment,
                                    allows_children: row.allows_children,
                                    sort_order: String(row.sort_order),
                                    is_active: row.is_active,
                                  })
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  void submitMutation(
                                    "org_unit_type",
                                    row.is_active ? "archive" : "restore",
                                    { id: row.id },
                                    row.is_active ? "Org unit type archived." : "Org unit type restored."
                                  )
                                }
                              >
                                {row.is_active ? "Archive" : "Restore"}
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-500">System catalog</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyHint title="No org unit types yet" description="Create a company-specific type to extend the catalog safely." />
              )}
            </div>
          </SurfacePanel>

          <SurfacePanel title="Org structure management" description="Create, nest, activate, and archive org units while preserving the current enterprise structure.">
            <div className="space-y-5">
              <AdminGrid>
                <AdminField label="Unit name">
                  <input className={adminInputClassName} value={orgUnitForm.name} onChange={(event) => setOrgUnitForm((current) => ({ ...current, name: event.target.value }))} />
                </AdminField>
                <AdminField label="Code">
                  <input className={adminInputClassName} value={orgUnitForm.code} onChange={(event) => setOrgUnitForm((current) => ({ ...current, code: event.target.value }))} placeholder="Optional short code" />
                </AdminField>
                <AdminField label="Unit type">
                  <SelectField value={orgUnitForm.unit_type_key} onChange={(value) => setOrgUnitForm((current) => ({ ...current, unit_type_key: value }))} options={adminData?.org_unit_types.map((row) => ({ value: row.key, label: `${row.name} (${row.category})` })) ?? []} />
                </AdminField>
                <AdminField label="Parent unit">
                  <SelectField value={orgUnitForm.parent_org_unit_id} onChange={(value) => setOrgUnitForm((current) => ({ ...current, parent_org_unit_id: value }))} options={orgUnitOptions} placeholder="Top-level unit" />
                </AdminField>
                <AdminField label="Status">
                  <select className={adminInputClassName} value={orgUnitForm.status} onChange={(event) => setOrgUnitForm((current) => ({ ...current, status: event.target.value as OrgUnitStatus }))}>
                    {UNIT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </AdminField>
                <AdminField label="Effective from">
                  <input className={adminInputClassName} type="date" value={orgUnitForm.effective_from} onChange={(event) => setOrgUnitForm((current) => ({ ...current, effective_from: event.target.value }))} />
                </AdminField>
                <AdminField label="Effective to">
                  <input className={adminInputClassName} type="date" value={orgUnitForm.effective_to} onChange={(event) => setOrgUnitForm((current) => ({ ...current, effective_to: event.target.value }))} />
                </AdminField>
              </AdminGrid>
              <CheckboxField checked={orgUnitForm.is_active} onChange={(value) => setOrgUnitForm((current) => ({ ...current, is_active: value }))} label="Unit is active" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void submitMutation("org_unit", "save", orgUnitForm as unknown as Record<string, unknown>, "Org unit saved.")}>
                  {orgUnitForm.id ? "Update unit" : "Create unit"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOrgUnitForm(emptyOrgUnitForm())}>
                  Reset
                </Button>
              </div>
              {adminData?.org_units?.length ? (
                <AdminTable headers={["Name", "Type", "Parent", "Status", "Dates", "Legacy", "Actions"]}>
                  {adminData.org_units.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">{row.unit_type_name ?? row.unit_type_key}</td>
                      <td className="px-4 py-3">{row.parent_org_unit_name ?? "Top-level"}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3">
                        {toInputDate(row.effective_from)} {row.effective_to ? `to ${toInputDate(row.effective_to)}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        {[row.branch_id ? "Branch" : "", row.legacy_department_id ? "Department" : "", row.legacy_team_id ? "Team" : ""].filter(Boolean).join(", ") || "Custom"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setOrgUnitForm({
                                id: row.id,
                                unit_type_key: row.unit_type_key,
                                name: row.name,
                                code: row.code ?? "",
                                parent_org_unit_id: row.parent_org_unit_id ?? "",
                                status: row.status,
                                is_active: row.is_active,
                                effective_from: toInputDate(row.effective_from),
                                effective_to: toInputDate(row.effective_to),
                              })
                            }
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              void submitMutation(
                                "org_unit",
                                row.status === "archived" ? "restore" : "archive",
                                { id: row.id },
                                row.status === "archived" ? "Org unit restored." : "Org unit archived."
                              )
                            }
                          >
                            {row.status === "archived" ? "Restore" : "Archive"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyHint title="No org units available" description="Create a first org unit to begin building the structure graph." />
              )}
            </div>
          </SurfacePanel>
        </div>
      ) : null}

      {tab === "roles" ? (
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <SurfacePanel title="Role family management" description="Company-specific role families inherit safely alongside the seeded system catalog.">
              <div className="space-y-5">
                <AdminGrid>
                  <AdminField label="Family key">
                    <input className={adminInputClassName} value={roleFamilyForm.key} onChange={(event) => setRoleFamilyForm((current) => ({ ...current, key: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Name">
                    <input className={adminInputClassName} value={roleFamilyForm.name} onChange={(event) => setRoleFamilyForm((current) => ({ ...current, name: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Sort order">
                    <input className={adminInputClassName} type="number" value={roleFamilyForm.sort_order} onChange={(event) => setRoleFamilyForm((current) => ({ ...current, sort_order: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Description" className="md:col-span-2 xl:col-span-3">
                    <textarea className={adminTextAreaClassName} value={roleFamilyForm.description} onChange={(event) => setRoleFamilyForm((current) => ({ ...current, description: event.target.value }))} />
                  </AdminField>
                </AdminGrid>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void submitMutation("role_family", "save", roleFamilyForm as unknown as Record<string, unknown>, "Role family saved.")}>
                    {roleFamilyForm.id ? "Update family" : "Create family"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setRoleFamilyForm(emptyRoleFamilyForm())}>
                    Reset
                  </Button>
                </div>
                <AdminTable headers={["Name", "Key", "Scope", "Description", "Actions"]}>
                  {(adminData?.role_families ?? []).map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">{row.key}</td>
                      <td className="px-4 py-3">{row.is_system_family ? "System" : "Custom"}</td>
                      <td className="px-4 py-3">{row.description ?? "Not set"}</td>
                      <td className="px-4 py-3">
                        {!row.is_system_family ? (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={() => setRoleFamilyForm({ id: row.id, key: row.key, name: row.name, description: row.description ?? "", sort_order: String(row.sort_order) })}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("role_family", "archive", { id: row.id }, "Role family archived.")}>
                              Archive
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">System catalog</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              </div>
            </SurfacePanel>

            <SurfacePanel title="Job role management" description="Manage executive, functional, and specialist roles separately from people and positions.">
              <div className="space-y-5">
                <AdminGrid>
                  <AdminField label="Role family">
                    <SelectField value={jobRoleForm.role_family_id} onChange={(value) => setJobRoleForm((current) => ({ ...current, role_family_id: value }))} options={roleFamilyOptions} />
                  </AdminField>
                  <AdminField label="Title">
                    <input className={adminInputClassName} value={jobRoleForm.title} onChange={(event) => setJobRoleForm((current) => ({ ...current, title: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Code">
                    <input className={adminInputClassName} value={jobRoleForm.code} onChange={(event) => setJobRoleForm((current) => ({ ...current, code: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Grade band">
                    <input className={adminInputClassName} value={jobRoleForm.grade_band} onChange={(event) => setJobRoleForm((current) => ({ ...current, grade_band: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Level code">
                    <input className={adminInputClassName} value={jobRoleForm.level_code} onChange={(event) => setJobRoleForm((current) => ({ ...current, level_code: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Employment type">
                    <input className={adminInputClassName} value={jobRoleForm.employment_type} onChange={(event) => setJobRoleForm((current) => ({ ...current, employment_type: event.target.value }))} placeholder="full_time, contract" />
                  </AdminField>
                  <AdminField label="Management scope">
                    <select className={adminInputClassName} value={jobRoleForm.management_scope} onChange={(event) => setJobRoleForm((current) => ({ ...current, management_scope: event.target.value }))}>
                      <option value="individual_contributor">individual_contributor</option>
                      <option value="people_manager">people_manager</option>
                      <option value="executive">executive</option>
                      <option value="matrix_manager">matrix_manager</option>
                    </select>
                  </AdminField>
                </AdminGrid>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <CheckboxField checked={jobRoleForm.is_executive} onChange={(value) => setJobRoleForm((current) => ({ ...current, is_executive: value }))} label="Executive role" />
                  <CheckboxField checked={jobRoleForm.supervisor_eligible} onChange={(value) => setJobRoleForm((current) => ({ ...current, supervisor_eligible: value }))} label="Team lead eligible" />
                  <CheckboxField checked={jobRoleForm.approver_eligible} onChange={(value) => setJobRoleForm((current) => ({ ...current, approver_eligible: value }))} label="Approver eligible" />
                  <CheckboxField checked={jobRoleForm.delegate_eligible} onChange={(value) => setJobRoleForm((current) => ({ ...current, delegate_eligible: value }))} label="Delegate eligible" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void submitMutation("job_role", "save", jobRoleForm as unknown as Record<string, unknown>, "Job role saved.")}>
                    {jobRoleForm.id ? "Update job role" : "Create job role"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setJobRoleForm(emptyJobRoleForm())}>
                    Reset
                  </Button>
                </div>
                <AdminTable headers={["Title", "Family", "Scope", "Grade", "Flags", "Actions"]}>
                  {(adminData?.job_roles ?? []).map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.title}</td>
                      <td className="px-4 py-3">{row.role_family_name ?? row.role_family_key}</td>
                      <td className="px-4 py-3">{row.management_scope}</td>
                      <td className="px-4 py-3">{row.grade_band ?? "Not set"}</td>
                      <td className="px-4 py-3">{[row.is_executive ? "Exec" : "", row.supervisor_eligible ? "Team lead" : "", row.approver_eligible ? "Approver" : ""].filter(Boolean).join(", ") || "Not set"}</td>
                      <td className="px-4 py-3">
                        {!row.is_system_role ? (
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={() => setJobRoleForm({ id: row.id, role_family_id: row.role_family_id, title: row.title, code: row.code ?? "", grade_band: row.grade_band ?? "", level_code: row.level_code ?? "", employment_type: row.employment_type ?? "", management_scope: row.management_scope, is_executive: row.is_executive, supervisor_eligible: row.supervisor_eligible, approver_eligible: row.approver_eligible, delegate_eligible: row.delegate_eligible })}>
                              Edit
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("job_role", "archive", { id: row.id }, "Job role archived.")}>
                              Archive
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">System catalog</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              </div>
            </SurfacePanel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SurfacePanel title="Position management" description="Positions separate planning and authority from the people who occupy them.">
              <div className="space-y-5">
                <AdminGrid>
                  <AdminField label="Org unit">
                    <SelectField value={positionForm.org_unit_id} onChange={(value) => setPositionForm((current) => ({ ...current, org_unit_id: value }))} options={orgUnitOptions} />
                  </AdminField>
                  <AdminField label="Job role">
                    <SelectField value={positionForm.job_role_id} onChange={(value) => setPositionForm((current) => ({ ...current, job_role_id: value }))} options={jobRoleOptions} />
                  </AdminField>
                  <AdminField label="Position code">
                    <input className={adminInputClassName} value={positionForm.position_code} onChange={(event) => setPositionForm((current) => ({ ...current, position_code: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Title override">
                    <input className={adminInputClassName} value={positionForm.title_override} onChange={(event) => setPositionForm((current) => ({ ...current, title_override: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Reports to position">
                    <SelectField value={positionForm.reports_to_position_id} onChange={(value) => setPositionForm((current) => ({ ...current, reports_to_position_id: value }))} options={positionOptions} placeholder="No direct parent position" />
                  </AdminField>
                  <AdminField label="Headcount limit">
                    <input className={adminInputClassName} type="number" value={positionForm.headcount_limit} onChange={(event) => setPositionForm((current) => ({ ...current, headcount_limit: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Status">
                    <select className={adminInputClassName} value={positionForm.status} onChange={(event) => setPositionForm((current) => ({ ...current, status: event.target.value as OrgPositionStatus }))}>
                      {POSITION_STATUSES.map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </AdminField>
                  <AdminField label="Effective from">
                    <input className={adminInputClassName} type="date" value={positionForm.effective_from} onChange={(event) => setPositionForm((current) => ({ ...current, effective_from: event.target.value }))} />
                  </AdminField>
                  <AdminField label="Effective to">
                    <input className={adminInputClassName} type="date" value={positionForm.effective_to} onChange={(event) => setPositionForm((current) => ({ ...current, effective_to: event.target.value }))} />
                  </AdminField>
                </AdminGrid>
                <div className="grid gap-3 md:grid-cols-3">
                  <CheckboxField checked={positionForm.is_key_position} onChange={(value) => setPositionForm((current) => ({ ...current, is_key_position: value }))} label="Key position" />
                  <CheckboxField checked={positionForm.is_people_manager} onChange={(value) => setPositionForm((current) => ({ ...current, is_people_manager: value }))} label="People manager" />
                  <CheckboxField checked={positionForm.is_approver_position} onChange={(value) => setPositionForm((current) => ({ ...current, is_approver_position: value }))} label="Approver position" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void submitMutation("position", "save", positionForm as unknown as Record<string, unknown>, "Position saved.")}>
                    {positionForm.id ? "Update position" : "Create position"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setPositionForm(emptyPositionForm())}>Reset</Button>
                </div>
                <AdminTable headers={["Code", "Role", "Unit", "Reports to", "Status", "Actions"]}>
                  {(adminData?.positions ?? []).map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.position_code}</td>
                      <td className="px-4 py-3">{row.title_override ?? row.job_role_title}</td>
                      <td className="px-4 py-3">{row.org_unit_name}</td>
                      <td className="px-4 py-3">{row.reports_to_position_label ?? "No parent position"}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => setPositionForm({ id: row.id, org_unit_id: row.org_unit_id, job_role_id: row.job_role_id, position_code: row.position_code, title_override: row.title_override ?? "", reports_to_position_id: row.reports_to_position_id ?? "", status: row.status, is_key_position: row.is_key_position, is_people_manager: row.is_people_manager, is_approver_position: row.is_approver_position, headcount_limit: row.headcount_limit ? String(row.headcount_limit) : "", effective_from: toInputDate(row.effective_from), effective_to: toInputDate(row.effective_to) })}>Edit</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("position", row.status === "archived" ? "restore" : "archive", { id: row.id }, row.status === "archived" ? "Position restored." : "Position archived.")}>{row.status === "archived" ? "Restore" : "Archive"}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              </div>
            </SurfacePanel>

            <SurfacePanel title="Position relationship management" description="Capture primary, matrix, delegate, acting, and escalation relationships between positions.">
              <div className="space-y-5">
                <AdminGrid>
                  <AdminField label="From position"><SelectField value={positionRelationshipForm.from_position_id} onChange={(value) => setPositionRelationshipForm((current) => ({ ...current, from_position_id: value }))} options={positionOptions} /></AdminField>
                  <AdminField label="To position"><SelectField value={positionRelationshipForm.to_position_id} onChange={(value) => setPositionRelationshipForm((current) => ({ ...current, to_position_id: value }))} options={positionOptions} /></AdminField>
                  <AdminField label="Relation type">
                    <select className={adminInputClassName} value={positionRelationshipForm.relation_type} onChange={(event) => setPositionRelationshipForm((current) => ({ ...current, relation_type: event.target.value as PositionRelationType }))}>
                      {POSITION_RELATION_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </AdminField>
                  <AdminField label="Effective from"><input className={adminInputClassName} type="date" value={positionRelationshipForm.effective_from} onChange={(event) => setPositionRelationshipForm((current) => ({ ...current, effective_from: event.target.value }))} /></AdminField>
                  <AdminField label="Effective to"><input className={adminInputClassName} type="date" value={positionRelationshipForm.effective_to} onChange={(event) => setPositionRelationshipForm((current) => ({ ...current, effective_to: event.target.value }))} /></AdminField>
                </AdminGrid>
                <CheckboxField checked={positionRelationshipForm.is_primary} onChange={(value) => setPositionRelationshipForm((current) => ({ ...current, is_primary: value }))} label="Primary relationship" />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => void submitMutation("position_relationship", "save", positionRelationshipForm as unknown as Record<string, unknown>, "Position relationship saved.")}>
                    {positionRelationshipForm.id ? "Update relationship" : "Create relationship"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setPositionRelationshipForm(emptyPositionRelationshipForm())}>Reset</Button>
                </div>
                <AdminTable headers={["From", "To", "Type", "Primary", "Actions"]}>
                  {(adminData?.position_relationships ?? []).map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3">{row.from_position_label}</td>
                      <td className="px-4 py-3">{row.to_position_label}</td>
                      <td className="px-4 py-3">{row.relation_type}</td>
                      <td className="px-4 py-3">{formatBool(row.is_primary)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="secondary" onClick={() => setPositionRelationshipForm({ id: row.id, from_position_id: row.from_position_id, to_position_id: row.to_position_id, relation_type: row.relation_type, is_primary: row.is_primary, effective_from: toInputDate(row.effective_from), effective_to: toInputDate(row.effective_to) })}>Edit</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("position_relationship", "archive", { id: row.id }, "Position relationship archived.")}>Archive</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </AdminTable>
              </div>
            </SurfacePanel>
          </div>
        </div>
      ) : null}

      {tab === "assignments" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {capabilities.canManagePositions ? (
          <SurfacePanel title="Employee assignment management" description="Support multiple and future-dated assignments into planned positions.">
            <div className="space-y-5">
              <AdminGrid>
                <AdminField label="Employee"><SelectField value={assignmentForm.employee_id} onChange={(value) => setAssignmentForm((current) => ({ ...current, employee_id: value }))} options={employeeOptions} /></AdminField>
                <AdminField label="Position"><SelectField value={assignmentForm.position_id} onChange={(value) => setAssignmentForm((current) => ({ ...current, position_id: value }))} options={positionOptions} /></AdminField>
                <AdminField label="Assignment type">
                  <select className={adminInputClassName} value={assignmentForm.assignment_type} onChange={(event) => setAssignmentForm((current) => ({ ...current, assignment_type: event.target.value as PositionAssignmentType }))}>
                    {POSITION_ASSIGNMENT_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </AdminField>
                <AdminField label="Allocation percent"><input className={adminInputClassName} type="number" value={assignmentForm.allocation_percent} onChange={(event) => setAssignmentForm((current) => ({ ...current, allocation_percent: event.target.value }))} /></AdminField>
                <AdminField label="Effective from"><input className={adminInputClassName} type="date" value={assignmentForm.effective_from} onChange={(event) => setAssignmentForm((current) => ({ ...current, effective_from: event.target.value }))} /></AdminField>
                <AdminField label="Effective to"><input className={adminInputClassName} type="date" value={assignmentForm.effective_to} onChange={(event) => setAssignmentForm((current) => ({ ...current, effective_to: event.target.value }))} /></AdminField>
              </AdminGrid>
              <CheckboxField checked={assignmentForm.is_primary} onChange={(value) => setAssignmentForm((current) => ({ ...current, is_primary: value }))} label="Primary assignment" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void submitMutation("employee_assignment", "save", assignmentForm as unknown as Record<string, unknown>, "Employee assignment saved.")}>
                  {assignmentForm.id ? "Update assignment" : "Create assignment"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAssignmentForm(emptyAssignmentForm())}>Reset</Button>
              </div>
              <AdminTable headers={["Employee", "Position", "Type", "Allocation", "Dates", "Actions"]}>
                {(adminData?.employee_assignments ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.employee_name}</td>
                    <td className="px-4 py-3">{row.position_label}</td>
                    <td className="px-4 py-3">{row.assignment_type}</td>
                    <td className="px-4 py-3">{row.allocation_percent}%</td>
                    <td className="px-4 py-3">{toInputDate(row.effective_from)} {row.effective_to ? `to ${toInputDate(row.effective_to)}` : ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setAssignmentForm({ id: row.id, employee_id: row.employee_id, position_id: row.position_id, assignment_type: row.assignment_type, is_primary: row.is_primary, allocation_percent: String(row.allocation_percent), effective_from: toInputDate(row.effective_from), effective_to: toInputDate(row.effective_to) })}>Edit</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("employee_assignment", "archive", { id: row.id }, "Employee assignment archived.")}>Archive</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </div>
          </SurfacePanel>
          ) : null}

          {capabilities.canManageReportingLines ? (
          <SurfacePanel title="Reporting line management" description="Manage primary, secondary, dotted-line, acting, delegate, functional, skip-level, and matrix relationships.">
            <div className="space-y-5">
              <AdminGrid>
                <AdminField label="Employee"><SelectField value={reportingLineForm.employee_id} onChange={(value) => setReportingLineForm((current) => ({ ...current, employee_id: value }))} options={employeeOptions} /></AdminField>
                <AdminField label="Manager"><SelectField value={reportingLineForm.manager_employee_id} onChange={(value) => setReportingLineForm((current) => ({ ...current, manager_employee_id: value }))} options={employeeOptions} /></AdminField>
                <AdminField label="Relation type">
                  <select className={adminInputClassName} value={reportingLineForm.relation_type} onChange={(event) => setReportingLineForm((current) => ({ ...current, relation_type: event.target.value as OrgReportingRelationType }))}>
                    {REPORTING_RELATION_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </AdminField>
                <AdminField label="Effective from"><input className={adminInputClassName} type="date" value={reportingLineForm.effective_from} onChange={(event) => setReportingLineForm((current) => ({ ...current, effective_from: event.target.value }))} /></AdminField>
                <AdminField label="Effective to"><input className={adminInputClassName} type="date" value={reportingLineForm.effective_to} onChange={(event) => setReportingLineForm((current) => ({ ...current, effective_to: event.target.value }))} /></AdminField>
              </AdminGrid>
              <CheckboxField checked={reportingLineForm.is_primary} onChange={(value) => setReportingLineForm((current) => ({ ...current, is_primary: value }))} label="Primary reporting line" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void submitMutation("reporting_line", "save", reportingLineForm as unknown as Record<string, unknown>, "Reporting line saved.")}>
                  {reportingLineForm.id ? "Update reporting line" : "Create reporting line"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setReportingLineForm(emptyReportingLineForm())}>Reset</Button>
              </div>
              <AdminTable headers={["Employee", "Manager", "Relation", "Primary", "Dates", "Actions"]}>
                {(adminData?.reporting_lines ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.employee_name}</td>
                    <td className="px-4 py-3">{row.manager_name}</td>
                    <td className="px-4 py-3">{row.relation_type}</td>
                    <td className="px-4 py-3">{formatBool(row.is_primary)}</td>
                    <td className="px-4 py-3">{toInputDate(row.effective_from)} {row.effective_to ? `to ${toInputDate(row.effective_to)}` : ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setReportingLineForm({ id: row.id, employee_id: row.employee_id, manager_employee_id: row.manager_employee_id, relation_type: row.relation_type, is_primary: row.is_primary, effective_from: toInputDate(row.effective_from), effective_to: toInputDate(row.effective_to) })}>Edit</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("reporting_line", "delete", { id: row.id }, "Reporting line deleted.")}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </div>
          </SurfacePanel>
          ) : null}
        </div>
      ) : null}

      {tab === "approvals" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          {capabilities.canManageDelegations ? (
          <SurfacePanel title="Approval delegation management" description="Delegate by employee, position, or scoped org unit with future-dated control.">
            <div className="space-y-5">
              <AdminGrid>
                <AdminField label="Delegator"><SelectField value={delegationForm.delegator_employee_id} onChange={(value) => setDelegationForm((current) => ({ ...current, delegator_employee_id: value }))} options={employeeOptions} /></AdminField>
                <AdminField label="Delegate"><SelectField value={delegationForm.delegate_employee_id} onChange={(value) => setDelegationForm((current) => ({ ...current, delegate_employee_id: value }))} options={employeeOptions} /></AdminField>
                <AdminField label="Position"><SelectField value={delegationForm.position_id} onChange={(value) => setDelegationForm((current) => ({ ...current, position_id: value }))} options={positionOptions} placeholder="Any position" /></AdminField>
                <AdminField label="Org unit"><SelectField value={delegationForm.org_unit_id} onChange={(value) => setDelegationForm((current) => ({ ...current, org_unit_id: value }))} options={orgUnitOptions} placeholder="Any unit" /></AdminField>
                <AdminField label="Module key"><input className={adminInputClassName} value={delegationForm.module_key} onChange={(event) => setDelegationForm((current) => ({ ...current, module_key: event.target.value }))} placeholder="leave, attendance, payroll" /></AdminField>
                <AdminField label="Request type"><input className={adminInputClassName} value={delegationForm.request_type} onChange={(event) => setDelegationForm((current) => ({ ...current, request_type: event.target.value }))} /></AdminField>
                <AdminField label="Effective from"><input className={adminInputClassName} type="date" value={delegationForm.effective_from} onChange={(event) => setDelegationForm((current) => ({ ...current, effective_from: event.target.value }))} /></AdminField>
                <AdminField label="Effective to"><input className={adminInputClassName} type="date" value={delegationForm.effective_to} onChange={(event) => setDelegationForm((current) => ({ ...current, effective_to: event.target.value }))} /></AdminField>
                <AdminField label="Notes" className="md:col-span-2 xl:col-span-2"><textarea className={adminTextAreaClassName} value={delegationForm.notes} onChange={(event) => setDelegationForm((current) => ({ ...current, notes: event.target.value }))} /></AdminField>
              </AdminGrid>
              <CheckboxField checked={delegationForm.is_active} onChange={(value) => setDelegationForm((current) => ({ ...current, is_active: value }))} label="Active delegation" />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void submitMutation("approval_delegation", "save", delegationForm as unknown as Record<string, unknown>, "Approval delegation saved.")}>{delegationForm.id ? "Update delegation" : "Create delegation"}</Button>
                <Button type="button" variant="secondary" onClick={() => setDelegationForm(emptyDelegationForm())}>Reset</Button>
              </div>
              <AdminTable headers={["Delegator", "Delegate", "Scope", "Module", "Status", "Actions"]}>
                {(adminData?.approval_delegations ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.delegator_name}</td>
                    <td className="px-4 py-3">{row.delegate_name}</td>
                    <td className="px-4 py-3">{row.org_unit_name ?? row.position_label ?? "Global"}</td>
                    <td className="px-4 py-3">{row.module_key ?? "All modules"}</td>
                    <td className="px-4 py-3">{row.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setDelegationForm({ id: row.id, delegator_employee_id: row.delegator_employee_id, delegate_employee_id: row.delegate_employee_id, position_id: row.position_id ?? "", org_unit_id: row.org_unit_id ?? "", module_key: row.module_key ?? "", request_type: row.request_type ?? "", effective_from: toInputDate(row.effective_from), effective_to: toInputDate(row.effective_to), is_active: row.is_active, notes: row.notes ?? "" })}>Edit</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("approval_delegation", row.is_active ? "archive" : "restore", { id: row.id }, row.is_active ? "Approval delegation archived." : "Approval delegation restored.")}>{row.is_active ? "Archive" : "Restore"}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </div>
          </SurfacePanel>
          ) : null}

          {capabilities.canManageApprovalRouting ? (
          <SurfacePanel title="Approval routing rule management" description="Filter and route approvals by org unit, geography, role family, role, and direct approver targets.">
            <div className="space-y-5">
              <AdminGrid>
                <AdminField label="Rule name"><input className={adminInputClassName} value={routingRuleForm.rule_name} onChange={(event) => setRoutingRuleForm((current) => ({ ...current, rule_name: event.target.value }))} /></AdminField>
                <AdminField label="Module key"><input className={adminInputClassName} value={routingRuleForm.module_key} onChange={(event) => setRoutingRuleForm((current) => ({ ...current, module_key: event.target.value }))} /></AdminField>
                <AdminField label="Request type"><input className={adminInputClassName} value={routingRuleForm.request_type} onChange={(event) => setRoutingRuleForm((current) => ({ ...current, request_type: event.target.value }))} /></AdminField>
                <AdminField label="Subject org unit"><SelectField value={routingRuleForm.subject_org_unit_id} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, subject_org_unit_id: value }))} options={orgUnitOptions} placeholder="Any unit" /></AdminField>
                <AdminField label="Subject geo unit"><SelectField value={routingRuleForm.subject_geo_org_unit_id} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, subject_geo_org_unit_id: value }))} options={orgUnitOptions} placeholder="Any geo unit" /></AdminField>
                <AdminField label="Role family"><SelectField value={routingRuleForm.subject_role_family_id} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, subject_role_family_id: value }))} options={roleFamilyOptions} placeholder="Any role family" /></AdminField>
                <AdminField label="Job role"><SelectField value={routingRuleForm.subject_job_role_id} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, subject_job_role_id: value }))} options={jobRoleOptions} placeholder="Any job role" /></AdminField>
                <AdminField label="Grade band"><input className={adminInputClassName} value={routingRuleForm.subject_grade_band} onChange={(event) => setRoutingRuleForm((current) => ({ ...current, subject_grade_band: event.target.value }))} /></AdminField>
                <AdminField label="Approver position"><SelectField value={routingRuleForm.approver_position_id} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, approver_position_id: value }))} options={positionOptions} placeholder="Direct employee approver instead" /></AdminField>
                <AdminField label="Approver employee"><SelectField value={routingRuleForm.approver_employee_id} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, approver_employee_id: value }))} options={employeeOptions} placeholder="No direct employee approver" /></AdminField>
                <AdminField label="Delegate employee"><SelectField value={routingRuleForm.delegate_employee_id} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, delegate_employee_id: value }))} options={employeeOptions} placeholder="No delegate" /></AdminField>
                <AdminField label="Step order"><input className={adminInputClassName} type="number" value={routingRuleForm.step_order} onChange={(event) => setRoutingRuleForm((current) => ({ ...current, step_order: event.target.value }))} /></AdminField>
                <AdminField label="Effective from"><input className={adminInputClassName} type="date" value={routingRuleForm.effective_from} onChange={(event) => setRoutingRuleForm((current) => ({ ...current, effective_from: event.target.value }))} /></AdminField>
                <AdminField label="Effective to"><input className={adminInputClassName} type="date" value={routingRuleForm.effective_to} onChange={(event) => setRoutingRuleForm((current) => ({ ...current, effective_to: event.target.value }))} /></AdminField>
              </AdminGrid>
              <div className="grid gap-3 md:grid-cols-2">
                <CheckboxField checked={routingRuleForm.is_required} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, is_required: value }))} label="Required step" />
                <CheckboxField checked={routingRuleForm.is_active} onChange={(value) => setRoutingRuleForm((current) => ({ ...current, is_active: value }))} label="Active rule" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void submitMutation("approval_routing_rule", "save", routingRuleForm as unknown as Record<string, unknown>, "Approval routing rule saved.")}>{routingRuleForm.id ? "Update routing rule" : "Create routing rule"}</Button>
                <Button type="button" variant="secondary" onClick={() => setRoutingRuleForm(emptyRoutingRuleForm())}>Reset</Button>
              </div>
              <AdminTable headers={["Rule", "Module", "Subject", "Approver", "Status", "Actions"]}>
                {(adminData?.approval_routing_rules ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.rule_name} - step {row.step_order}</td>
                    <td className="px-4 py-3">{row.module_key}</td>
                    <td className="px-4 py-3">{row.subject_org_unit_name ?? row.subject_role_family_name ?? row.subject_job_role_title ?? "Global"}</td>
                    <td className="px-4 py-3">{row.approver_position_label ?? row.approver_employee_name ?? "Unassigned"}</td>
                    <td className="px-4 py-3">{row.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="secondary" onClick={() => setRoutingRuleForm({ id: row.id, rule_name: row.rule_name, module_key: row.module_key, request_type: row.request_type ?? "", subject_org_unit_id: row.subject_org_unit_id ?? "", subject_geo_org_unit_id: row.subject_geo_org_unit_id ?? "", subject_role_family_id: row.subject_role_family_id ?? "", subject_job_role_id: row.subject_job_role_id ?? "", subject_grade_band: row.subject_grade_band ?? "", approver_position_id: row.approver_position_id ?? "", approver_employee_id: row.approver_employee_id ?? "", delegate_employee_id: row.delegate_employee_id ?? "", step_order: String(row.step_order), is_required: row.is_required, is_active: row.is_active, effective_from: toInputDate(row.effective_from), effective_to: toInputDate(row.effective_to) })}>Edit</Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => void submitMutation("approval_routing_rule", row.is_active ? "archive" : "restore", { id: row.id }, row.is_active ? "Approval routing rule archived." : "Approval routing rule restored.")}>{row.is_active ? "Archive" : "Restore"}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </div>
          </SurfacePanel>
          ) : null}
        </div>
      ) : null}

      {tab === "explorer" ? (
        <div className="space-y-6">
          <SurfacePanel title="Explorer filters" description="Search and filter directory and assignment snapshots by location, org unit, role family, position, and manager.">
            <AdminGrid className="xl:grid-cols-4">
              <AdminField label="Search">
                <input className={adminInputClassName} value={explorerSearch} onChange={(event) => setExplorerSearch(event.target.value)} placeholder="Search names, units, roles, codes" />
              </AdminField>
              <AdminField label="Unit category">
                <SelectField value={directoryCategoryFilter} onChange={setDirectoryCategoryFilter} options={UNIT_CATEGORIES.map((value) => ({ value, label: value }))} placeholder="All categories" />
              </AdminField>
              <AdminField label="Unit type">
                <SelectField value={directoryTypeFilter} onChange={setDirectoryTypeFilter} options={(adminData?.org_unit_types ?? []).map((row) => ({ value: row.key, label: row.name }))} placeholder="All unit types" />
              </AdminField>
              <AdminField label="Directory status">
                <SelectField value={directoryStatusFilter} onChange={setDirectoryStatusFilter} options={UNIT_STATUSES.map((value) => ({ value, label: value }))} placeholder="All statuses" />
              </AdminField>
              <AdminField label="City">
                <SelectField value={cityFilter} onChange={setCityFilter} options={cities} placeholder="All cities" />
              </AdminField>
              <AdminField label="Office / Branch">
                <SelectField value={officeFilter} onChange={setOfficeFilter} options={offices} placeholder="All offices" />
              </AdminField>
              <AdminField label="Department">
                <SelectField value={departmentFilter} onChange={setDepartmentFilter} options={departments} placeholder="All departments" />
              </AdminField>
              <AdminField label="Team">
                <SelectField value={teamFilter} onChange={setTeamFilter} options={teams} placeholder="All teams" />
              </AdminField>
              <AdminField label="Role family">
                <SelectField value={roleFamilyFilter} onChange={setRoleFamilyFilter} options={roleFamilyOptions} placeholder="All role families" />
              </AdminField>
              <AdminField label="Position">
                <SelectField value={positionFilter} onChange={setPositionFilter} options={positionOptions} placeholder="All positions" />
              </AdminField>
              <AdminField label="Manager">
                <SelectField value={managerFilter} onChange={setManagerFilter} options={employeeOptions} placeholder="All managers" />
              </AdminField>
            </AdminGrid>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setExplorerSearch("");
                  setDirectoryCategoryFilter("");
                  setDirectoryStatusFilter("");
                  setDirectoryTypeFilter("");
                  setCityFilter("");
                  setOfficeFilter("");
                  setDepartmentFilter("");
                  setTeamFilter("");
                  setRoleFamilyFilter("");
                  setPositionFilter("");
                  setManagerFilter("");
                }}
              >
                Reset filters
              </Button>
            </div>
          </SurfacePanel>

          <div className="grid gap-6 xl:grid-cols-2">
            <SurfacePanel title="Organization directory" description="Browse the organization directory by structure, location, status, and parent-child context.">
              {filteredDirectory.length ? (
                <AdminTable headers={["Name", "Type", "Category", "Parent", "Status", "Legacy"]}>
                  {filteredDirectory.map((row) => (
                    <tr key={row.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.name}</td>
                      <td className="px-4 py-3">{row.unit_type_name}</td>
                      <td className="px-4 py-3">{row.unit_category}</td>
                      <td className="px-4 py-3">{row.parent_org_unit_name ?? "Top-level"}</td>
                      <td className="px-4 py-3">{row.status}</td>
                      <td className="px-4 py-3">{[row.branch_name, row.legacy_department_name, row.legacy_team_name].filter(Boolean).join(" / ") || "Custom"}</td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyHint title="No directory rows match these filters" description="Adjust the explorer filters or create more org units." />
              )}
            </SurfacePanel>

            <SurfacePanel title="Assignment and reporting snapshot" description="Review assignments, reporting context, and role-family coverage with manager-aware filters.">
              {filteredAssignmentSnapshot.length ? (
                <AdminTable headers={["Employee", "Position", "Unit", "Role family", "Assignment", "Allocation"]}>
                  {filteredAssignmentSnapshot.map((row) => (
                    <tr key={row.assignment_id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{row.employee_name}</td>
                      <td className="px-4 py-3">{row.position_title}</td>
                      <td className="px-4 py-3">{row.org_unit_name}</td>
                      <td className="px-4 py-3">{row.role_family_name}</td>
                      <td className="px-4 py-3">{row.assignment_type}{row.is_primary ? " (primary)" : ""}</td>
                      <td className="px-4 py-3">{row.allocation_percent}%</td>
                    </tr>
                  ))}
                </AdminTable>
              ) : (
                <EmptyHint title="No assignments match these filters" description="Adjust the explorer filters or assign employees to positions." />
              )}
            </SurfacePanel>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
