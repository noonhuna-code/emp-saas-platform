import type { DashboardApiResult } from "@/lib/types/api";
import type { DashboardSession } from "@/lib/types/auth";
import type {
  AttendanceCorrectionRequestInput,
  AttendanceCorrectionRequestResponse,
  AttendanceCorrectionReviewMutationResponse,
  AttendanceHistoryResponse,
  ShiftChangeCandidatesResponse,
  ShiftSwapCreateResponse,
  ShiftSwapRequestsResponse,
  ShiftSwapReviewResponse,
  AttendanceReviewListResponse,
  AttendanceTodayResponse,
  TeamAttendanceResponse
} from "@/lib/types/attendance";
import type {
  LeaveApplyInput,
  LeaveApplyResponse,
  LeaveBalancesResponse,
  LeaveCalendarResponse,
  LeaveCancelResponse,
  LeaveDecisionResponse,
  LeaveHistoryResponse,
  LeaveReviewResponse,
  LeaveTypesResponse
} from "@/lib/types/leave";
import type { ApprovalsResponse } from "@/lib/types/approvals";
import type {
  IdempotencyCleanupResponse,
  MonitoringOverview,
  SecurityAuditTimelineEventType,
  SecurityAuditTimelineResponse
} from "@/lib/types/monitoring";
import type {
  EmployeeReliabilityResponse,
  KudosHistoryResponse,
  KudosInput,
  KudosLeaderboardResponse,
  ReliabilityOverview,
  SupervisorFeedbackInput,
  SupervisorFeedbackResponse
} from "@/lib/types/intelligence";
import type { EmployeeDetailResponse, EmployeeListResponse } from "@/lib/types/employees";
import type {
  EmployeeDocumentDownloadResponse,
  EmployeeDocumentUploadResponse,
  EmployeeDocumentVersionsResponse,
  EmployeeLookupResponse,
  EmployeeProfileResponse
} from "@/lib/types/profile";
import type { OvertimeDecisionResponse, OvertimeListResponse, OvertimeRequestInput, OvertimeRequestResponse } from "@/lib/types/overtime";
import type { AdminDashboardResponse, EmployeeDashboardResponse, ManagerDashboardResponse } from "@/lib/types/dashboard";
import type { OrgChartResponse } from "@/lib/types/org";
import type { OrganizationAdminData, OrganizationOverview } from "@emp/lib/types";
import type {
  PayrollCostTrendPoint,
  PayrollDeliveryMetricsPoint,
  PayrollCloseoutLatencyResponse,
  PayrollGrowthMetricsResponse,
  PayrollLifecycleMutationResponse,
  PayrollRunDeliveryStatusResponse,
  PayrollRunDetailResponse,
  PayrollRunMutationResponse,
  PayrollRunPayslipEmailBulkQueueResponse,
  PayrollRunsResponse,
  PayrollRunTimelineResponse,
  PayslipEmailDispatchResponse,
  PayslipDetailResponse,
  PayslipHistoryResponse
} from "@/lib/types/payroll";
import type {
  BillingCancellationResult,
  BillingOverdueSchedulerResult,
  BillingInvoiceGenerationResult,
  BillingInvoiceList,
  BillingPaymentProofList,
  BillingPaymentProofSubmitResult,
  BillingInvoiceTransitionResult,
  BillingOverview,
  BillingPlanCatalog,
  BillingSeatAssignmentList,
  BillingSeatMutationResult,
  BillingTrialBootstrapResult,
  BillingWebhookProcessResult
} from "@/lib/types/billing";
import type { PlatformOverviewResponse } from "@/lib/types/platform";
import type {
  AssignBreakResponse,
  AssignShiftResponse,
  BreakAssignmentsResponse,
  RemoveBreakAssignmentResponse,
  RemoveShiftAssignmentResponse,
  ShiftAssignableEmployeesResponse,
  ShiftAssignmentsResponse,
  ShiftTemplatesResponse,
  UpdateBreakAssignmentResponse,
  UpdateShiftAssignmentResponse,
  WorkspaceChatResponse,
  WorkspaceContactsResponse,
  WorkspaceCreateNoteResponse,
  WorkspaceCalendarResponse,
  WorkspaceMarkNotificationsReadResponse,
  WorkspaceNotesResponse,
  WorkspaceNotificationsResponse,
  WorkspaceResourceListResponse,
  WorkspaceSendChatResponse
} from "@/lib/types/workspace";
import type { ProjectListResponse, ProjectTaskListResponse } from "@/lib/types/projects";
import type {
  MyFinancialObligationRequestsResponse,
  SubmitFinancialObligationRequestResponse
} from "@/lib/types/finance";

export type AccessExplanationReason = {
  code: string;
  label: string;
  source: "broad_permission" | "derived" | "explicit" | "context";
  detail?: string;
  relationType?: string | null;
  scopeType?: string | null;
  scopeEntityId?: string | null;
  inherited?: boolean;
};

export type EmployeeAccessExplanation = {
  employeeId: string;
  allowed: boolean;
  broadAccess: boolean;
  reasons: AccessExplanationReason[];
};

export type OrgUnitAccessExplanation = {
  orgUnitId: string;
  allowed: boolean;
  broadAccess: boolean;
  reasons: AccessExplanationReason[];
};

const parseJson = async <T>(response: Response): Promise<DashboardApiResult<T>> => {
  const payload = (await response.json()) as DashboardApiResult<T>;
  return payload;
};


type CacheEntry<T> = { ts: number; value?: DashboardApiResult<T>; promise?: Promise<DashboardApiResult<T>> };
const GET_CACHE = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 120000;
const STORAGE_PREFIX = "emp:get:";
let CACHE_SCOPE = "global";

const getCacheKey = (url: string): string => `${CACHE_SCOPE}:${url}`;

const readSessionCache = <T>(url: string): CacheEntry<T> | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${url}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; value: DashboardApiResult<T> };
    if (!parsed || typeof parsed.ts !== "number" || !parsed.value) return null;
    if (!parsed.value.ok) return null;
    return { ts: parsed.ts, value: parsed.value };
  } catch {
    return null;
  }
};

const writeSessionCache = <T>(url: string, ts: number, value: DashboardApiResult<T>): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${url}`, JSON.stringify({ ts, value }));
  } catch {
    // ignore browser storage failures
  }
};

const fetchWithCache = async <T>(url: string, ttlMs: number = DEFAULT_TTL): Promise<DashboardApiResult<T>> => {
  const now = Date.now();
  const cacheKey = getCacheKey(url);
  let existing = GET_CACHE.get(cacheKey) as CacheEntry<T> | undefined;

  if (existing?.value && !existing.value.ok) {
    GET_CACHE.delete(cacheKey);
    existing = undefined;
  }

  if (!existing?.value && !existing?.promise) {
    const persisted = readSessionCache<T>(cacheKey);
    if (persisted?.value) {
      GET_CACHE.set(cacheKey, persisted as CacheEntry<unknown>);
      existing = persisted;
    }
  }

  if (existing?.value) {
    if (!existing.promise && now - existing.ts >= ttlMs) {
      const refreshPromise = fetch(url, { cache: "no-store" })
        .then(parseJson<T>)
        .then((result) => {
          if (!result.ok) {
            return existing?.value ?? result;
          }
          const ts = Date.now();
          GET_CACHE.set(cacheKey, { ts, value: result });
          writeSessionCache(cacheKey, ts, result);
          return result;
        })
        .finally(() => {
          const entry = GET_CACHE.get(cacheKey);
          if (entry) entry.promise = undefined;
        });
      GET_CACHE.set(cacheKey, { ts: existing.ts, value: existing.value, promise: refreshPromise });
    }
    return existing.value;
  }

  if (existing?.promise) {
    return existing.promise;
  }

  const promise = fetch(url, { cache: "no-store" })
    .then(parseJson<T>)
    .then((result) => {
      if (!result.ok) {
        GET_CACHE.delete(cacheKey);
        return result;
      }
      const ts = Date.now();
      GET_CACHE.set(cacheKey, { ts, value: result });
      writeSessionCache(cacheKey, ts, result);
      return result;
    })
    .finally(() => {
      const entry = GET_CACHE.get(cacheKey);
      if (entry) entry.promise = undefined;
    });

  GET_CACHE.set(cacheKey, { ts: now, promise });
  return promise;
};

export const peekCachedResult = <T>(url: string): DashboardApiResult<T> | null => {
  const cacheKey = getCacheKey(url);
  const existing = GET_CACHE.get(cacheKey) as CacheEntry<T> | undefined;
  if (existing?.value?.ok && existing.value.data) {
    return existing.value;
  }

  const persisted = readSessionCache<T>(cacheKey);
  if (persisted?.value?.ok && persisted.value.data) {
    GET_CACHE.set(cacheKey, persisted as CacheEntry<unknown>);
    return persisted.value;
  }

  return null;
};
export const setClientCacheScope = (scope: string): void => {
  const normalized = scope.trim().toLowerCase();
  const nextScope = normalized.length > 0 ? normalized : "global";
  if (nextScope === CACHE_SCOPE) return;

  CACHE_SCOPE = nextScope;
  GET_CACHE.clear();

  if (typeof window === "undefined") return;
  try {
    const keysToDelete: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore session storage access failures
  }
};

const invalidateCachedUrls = (urls: string[]): void => {
  for (const url of urls) {
    const cacheKey = getCacheKey(url);
    GET_CACHE.delete(cacheKey);

    if (typeof window === "undefined") continue;
    try {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${cacheKey}`);
    } catch {
      // ignore browser storage failures
    }
  }
};

const invalidateCachedUrlPrefix = (prefix: string): void => {
  const scopedPrefix = `${CACHE_SCOPE}:${prefix}`;

  for (const key of Array.from(GET_CACHE.keys())) {
    if (key.startsWith(scopedPrefix)) {
      GET_CACHE.delete(key);
    }
  }

  if (typeof window === "undefined") return;
  try {
    const keysToDelete: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key && key.startsWith(`${STORAGE_PREFIX}${scopedPrefix}`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore browser storage failures
  }
};

const invalidateEmployeeProfileCache = (employeeId: string): void => {
  invalidateCachedUrls([
    `/api/employees/${employeeId}/profile`,
    "/api/employees/me"
  ]);
};

const invalidateLeaveCache = (): void => {
  invalidateCachedUrlPrefix("/api/leave/history");
  invalidateCachedUrlPrefix("/api/leave/balances");
  invalidateCachedUrlPrefix("/api/leave/types");
  invalidateCachedUrlPrefix("/api/leave/review/pending");
  invalidateCachedUrlPrefix("/api/leave/review/history");
  invalidateCachedUrlPrefix("/api/leave/calendar");
  invalidateCachedUrls([
    "/api/dashboard/employee",
    "/api/dashboard/manager",
    "/api/approvals/pending",
  ]);
};

const invalidateShiftWorkspaceCache = (): void => {
  invalidateCachedUrlPrefix("/api/attendance/shifts/assignable");
  invalidateCachedUrlPrefix("/api/attendance/shifts/assignments");
  invalidateCachedUrlPrefix("/api/attendance/breaks/assignments");
  invalidateCachedUrlPrefix("/api/attendance/shift-swaps");
  invalidateCachedUrls([
    "/api/dashboard/employee",
    "/api/dashboard/manager",
    "/api/attendance/team",
  ]);
};

const postJson = async <T>(
  url: string,
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Promise<DashboardApiResult<T>> => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

  return parseJson<T>(response);
};

export const fetchSession = async (): Promise<DashboardApiResult<DashboardSession>> => {
  const response = await fetchWithCache<DashboardSession>("/api/auth/session", 30000);
  return response;
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<DashboardApiResult<{ redirectTo: string; message: string }>> => {
  return postJson<{ redirectTo: string; message: string }>(
    "/api/auth/password",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const updateSettingsAccount = async (payload: {
  fullName?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  alternatePhone?: string | null;
  personalEmail?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
}): Promise<
  DashboardApiResult<{
    employeeId: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    officialEmail: string | null;
    personalEmail: string | null;
    phoneNumber: string | null;
    alternatePhone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
  }>
> => {
  return postJson(
    "/api/settings/account",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const uploadSettingsAvatar = async (
  file: File
): Promise<
  DashboardApiResult<{
    employeeId: string | null;
    fullName: string | null;
    avatarUrl: string | null;
    officialEmail: string | null;
    personalEmail: string | null;
    phoneNumber: string | null;
    alternatePhone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
  }>
> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/settings/avatar", {
    method: "POST",
    headers: {
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: formData,
  });
  return parseJson(response);
};

export const revokeSettingsSession = async (
  sessionId: string
): Promise<
  DashboardApiResult<{
    sessions: Array<{
      id: string;
      createdAt: string;
      lastSeenAt: string;
      expiresAt: string;
      revokedAt: string | null;
      revokedReason: string | null;
      status: "current" | "active" | "expired" | "revoked";
    }>;
    devices: Array<{
      id: string;
      deviceHashMasked: string;
      firstSeenAt: string;
      lastSeenAt: string;
      riskScore: number;
    }>;
  }>
> => {
  return postJson(
    "/api/settings/sessions/revoke",
    { sessionId },
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const revokeOtherSettingsSessions = async (): Promise<
  DashboardApiResult<{
    sessions: Array<{
      id: string;
      createdAt: string;
      lastSeenAt: string;
      expiresAt: string;
      revokedAt: string | null;
      revokedReason: string | null;
      status: "current" | "active" | "expired" | "revoked";
    }>;
    devices: Array<{
      id: string;
      deviceHashMasked: string;
      firstSeenAt: string;
      lastSeenAt: string;
      riskScore: number;
    }>;
  }>
> => {
  return postJson(
    "/api/settings/sessions/revoke-others",
    {},
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const forgetSettingsDevice = async (
  deviceId: string
): Promise<
  DashboardApiResult<{
    sessions: Array<{
      id: string;
      createdAt: string;
      lastSeenAt: string;
      expiresAt: string;
      revokedAt: string | null;
      revokedReason: string | null;
      status: "current" | "active" | "expired" | "revoked";
    }>;
    devices: Array<{
      id: string;
      deviceHashMasked: string;
      firstSeenAt: string;
      lastSeenAt: string;
      riskScore: number;
    }>;
  }>
> => {
  return postJson(
    "/api/settings/devices/forget",
    { deviceId },
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchEmployees = async (params: {
  query?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<DashboardApiResult<EmployeeListResponse>> => {
  const query = new URLSearchParams();
  if (params.query) query.set("query", params.query);
  if (params.departmentId) query.set("department_id", params.departmentId);
  if (params.status) query.set("status", params.status);
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/employees${suffix}`, { cache: "no-store" });
  return parseJson<EmployeeListResponse>(response);
};

export const fetchEmployeeDetail = async (
  employeeId: string
): Promise<DashboardApiResult<EmployeeDetailResponse>> => {
  const response = await fetch(`/api/employees/${employeeId}`, { cache: "no-store" });
  return parseJson<EmployeeDetailResponse>(response);
};

export const fetchEmployeeMe = async (): Promise<DashboardApiResult<{ employeeId: string }>> => {
  const response = await fetchWithCache<{ employeeId: string }>("/api/employees/me");
  return response;
};
export const fetchCurrentEmployeeId = async (): Promise<DashboardApiResult<{ employeeId: string }>> => {
  const response = await fetchWithCache<{ employeeId: string }>("/api/employees/me");
  return response;
};

export const fetchEmployeeProfile = async (
  employeeId: string
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const response = await fetchWithCache<EmployeeProfileResponse>(`/api/employees/${employeeId}/profile`);
  return response;
};

export const fetchEmployeeLookups = async (): Promise<DashboardApiResult<EmployeeLookupResponse>> => {
  const response = await fetchWithCache<EmployeeLookupResponse>("/api/employees/lookups");
  return response;
};

export const updatePersonalDetails = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const result = await postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/personal`, payload);
  if (result.ok) {
    invalidateEmployeeProfileCache(employeeId);
  }
  return result;
};

export const updateEmploymentInfo = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const result = await postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/employment`, payload);
  if (result.ok) {
    invalidateEmployeeProfileCache(employeeId);
  }
  return result;
};

export const updateSensitiveData = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const result = await postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/sensitive`, payload);
  if (result.ok) {
    invalidateEmployeeProfileCache(employeeId);
  }
  return result;
};

export const addEmployeeDocument = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/documents`, payload);
};

export const updateEmployeeDocument = async (
  employeeId: string,
  documentId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/documents/${documentId}`, payload);
};

export const deleteEmployeeDocument = async (
  employeeId: string,
  documentId: string
): Promise<DashboardApiResult<{ id: string }>> => {
  const response = await fetch(`/api/employees/${employeeId}/documents/${documentId}`, {
    method: "DELETE"
  });
  return parseJson<{ id: string }>(response);
};

export const fetchEmployeeDocumentVersions = async (
  employeeId: string,
  documentId: string
): Promise<DashboardApiResult<EmployeeDocumentVersionsResponse>> => {
  const response = await fetch(`/api/employees/${employeeId}/documents/${documentId}/versions`, { cache: "no-store" });
  return parseJson<EmployeeDocumentVersionsResponse>(response);
};

export const uploadEmployeeDocumentVersion = async (
  employeeId: string,
  documentId: string,
  file: File
): Promise<DashboardApiResult<EmployeeDocumentUploadResponse>> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/employees/${employeeId}/documents/${documentId}/upload`, {
    method: "POST",
    body: formData
  });
  return parseJson<EmployeeDocumentUploadResponse>(response);
};

export const fetchEmployeeDocumentDownloadUrl = async (
  employeeId: string,
  documentId: string,
  versionId?: string
): Promise<DashboardApiResult<EmployeeDocumentDownloadResponse>> => {
  const suffix = versionId ? `?versionId=${encodeURIComponent(versionId)}` : "";
  const response = await fetch(`/api/employees/${employeeId}/documents/${documentId}/download${suffix}`, {
    cache: "no-store"
  });
  return parseJson<EmployeeDocumentDownloadResponse>(response);
};

export const addEmployeeFamilyMember = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/family`, payload);
};

export const updateEmployeeFamilyMember = async (
  employeeId: string,
  memberId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/family/${memberId}`, payload);
};

export const deleteEmployeeFamilyMember = async (
  employeeId: string,
  memberId: string
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const response = await fetch(`/api/employees/${employeeId}/family/${memberId}`, {
    method: "DELETE"
  });
  return parseJson<EmployeeProfileResponse>(response);
};

export const addEmployeeSkill = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/skills`, payload);
};

export const updateEmployeeSkill = async (
  employeeId: string,
  skillId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/skills/${skillId}`, payload);
};

export const deleteEmployeeSkill = async (
  employeeId: string,
  skillId: string
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const response = await fetch(`/api/employees/${employeeId}/skills/${skillId}`, {
    method: "DELETE"
  });
  return parseJson<EmployeeProfileResponse>(response);
};

export const addEmployeeEducation = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/education`, payload);
};

export const updateEmployeeEducation = async (
  employeeId: string,
  educationId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/education/${educationId}`, payload);
};

export const deleteEmployeeEducation = async (
  employeeId: string,
  educationId: string
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const response = await fetch(`/api/employees/${employeeId}/education/${educationId}`, {
    method: "DELETE"
  });
  return parseJson<EmployeeProfileResponse>(response);
};

export const fetchEmployeeDashboard = async (): Promise<DashboardApiResult<EmployeeDashboardResponse>> => {
  const response = await fetchWithCache<EmployeeDashboardResponse>("/api/dashboard/employee");
  return response;
};

export const fetchManagerDashboard = async (): Promise<DashboardApiResult<ManagerDashboardResponse>> => {
  const response = await fetchWithCache<ManagerDashboardResponse>("/api/dashboard/manager");
  return response;
};

export const fetchAdminDashboard = async (): Promise<DashboardApiResult<AdminDashboardResponse>> => {
  const response = await fetchWithCache<AdminDashboardResponse>("/api/dashboard/admin");
  return response;
};

export const fetchOvertimeRequests = async (params: {
  employeeId?: string;
  status?: string;
} = {}): Promise<DashboardApiResult<OvertimeListResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<OvertimeListResponse>(`/api/overtime/list${suffix}`);
  return response;
};

export const requestOvertime = async (
  payload: OvertimeRequestInput
): Promise<DashboardApiResult<OvertimeRequestResponse>> => {
  return postJson<OvertimeRequestResponse>(
    "/api/overtime/request",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const approveOvertime = async (
  requestId: string
): Promise<DashboardApiResult<OvertimeDecisionResponse>> => {
  return postJson<OvertimeDecisionResponse>(
    "/api/overtime/approve",
    { requestId },
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const rejectOvertime = async (
  requestId: string,
  reason: string
): Promise<DashboardApiResult<OvertimeDecisionResponse>> => {
  return postJson<OvertimeDecisionResponse>(
    "/api/overtime/reject",
    { requestId, reason },
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchOrgChart = async (): Promise<DashboardApiResult<OrgChartResponse>> => {
  const response = await fetchWithCache<OrgChartResponse>("/api/org-chart", 60000);
  return response;
};

export const fetchOrganizationOverview = async (): Promise<DashboardApiResult<OrganizationOverview>> => {
  return fetchWithCache<OrganizationOverview>("/api/organization/overview", 30000);
};

export const fetchOrganizationAdminData = async (): Promise<DashboardApiResult<OrganizationAdminData>> => {
  return fetchWithCache<OrganizationAdminData>("/api/organization/admin", 30000);
};

export const mutateOrganizationAdmin = async (payload: {
  resource: string;
  action?: "save" | "archive" | "restore" | "delete";
  payload: Record<string, unknown>;
}): Promise<DashboardApiResult<{ id?: string }>> => {
  return postJson<{ id?: string }>(
    "/api/organization/admin",
    payload as unknown as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchEmployeeAccessExplanation = async (
  employeeId: string
): Promise<DashboardApiResult<EmployeeAccessExplanation>> => {
  const response = await fetch(`/api/organization/access/employees/${encodeURIComponent(employeeId)}`, {
    cache: "no-store"
  });
  return parseJson<EmployeeAccessExplanation>(response);
};

export const fetchOrgUnitAccessExplanation = async (
  orgUnitId: string
): Promise<DashboardApiResult<OrgUnitAccessExplanation>> => {
  const response = await fetch(`/api/organization/access/org-units/${encodeURIComponent(orgUnitId)}`, {
    cache: "no-store"
  });
  return parseJson<OrgUnitAccessExplanation>(response);
};

export const fetchProjects = async (params: {
  limit?: number;
} = {}): Promise<DashboardApiResult<ProjectListResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return fetchWithCache<ProjectListResponse>(`/api/projects${suffix}`, 30000);
};

export const fetchProjectTasks = async (params: {
  projectId?: string;
  limit?: number;
} = {}): Promise<DashboardApiResult<ProjectTaskListResponse>> => {
  const query = new URLSearchParams();
  if (params.projectId) query.set("projectId", params.projectId);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return fetchWithCache<ProjectTaskListResponse>(`/api/projects/tasks${suffix}`, 30000);
};

export const fetchAttendanceToday = async (): Promise<DashboardApiResult<AttendanceTodayResponse>> => {
  const response = await fetchWithCache<AttendanceTodayResponse>("/api/attendance/today");
  return response;
};

export const fetchAttendanceHistory = async (params: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
} = {}): Promise<DashboardApiResult<AttendanceHistoryResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (params.status) query.set("status", params.status);

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<AttendanceHistoryResponse>(`/api/attendance/history${suffix}`);
  return response;
};

export const fetchTeamAttendance = async (params: {
  status?: string;
  departmentId?: string;
} = {}): Promise<DashboardApiResult<TeamAttendanceResponse>> => {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.departmentId) query.set("departmentId", params.departmentId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/attendance/team${suffix}`, { cache: "no-store" });
  return parseJson<TeamAttendanceResponse>(response);
};

export const createAttendanceCorrectionRequest = async (
  payload: AttendanceCorrectionRequestInput
): Promise<DashboardApiResult<AttendanceCorrectionRequestResponse>> => {
  return postJson<AttendanceCorrectionRequestResponse>(
    "/api/attendance/correction-request",
    payload,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const assignGoApplied = async (payload: {
  employeeId: string;
  attendanceDate: string;
  note?: string | null;
}): Promise<DashboardApiResult<{ attendanceId: string }>> => {
  return postJson<{ attendanceId: string }>(
    "/api/attendance/go-assign",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchAttendanceReviewQueue = async (params: {
  employeeId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
} = {}): Promise<DashboardApiResult<AttendanceReviewListResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/attendance/review${suffix}`, { cache: "no-store" });
  return parseJson<AttendanceReviewListResponse>(response);
};

export const approveAttendanceCorrectionRequest = async (
  correctionId: string
): Promise<DashboardApiResult<AttendanceCorrectionReviewMutationResponse>> => {
  return postJson<AttendanceCorrectionReviewMutationResponse>("/api/attendance/approve", { correctionId });
};

export const rejectAttendanceCorrectionRequest = async (
  correctionId: string,
  reason: string
): Promise<DashboardApiResult<AttendanceCorrectionReviewMutationResponse>> => {
  return postJson<AttendanceCorrectionReviewMutationResponse>("/api/attendance/reject", { correctionId, reason });
};

export const fetchLeaveBalances = async (params: {
  employeeId?: string;
  year?: number;
} = {}): Promise<DashboardApiResult<LeaveBalancesResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (typeof params.year === "number") query.set("year", String(params.year));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<LeaveBalancesResponse>(`/api/leave/balances${suffix}`);
  return response;
};

export const fetchLeaveTypes = async (params: {
  employeeId?: string;
} = {}): Promise<DashboardApiResult<LeaveTypesResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<LeaveTypesResponse>(`/api/leave/types${suffix}`);
  return response;
};

export const fetchLeaveHistory = async (params: {
  employeeId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<DashboardApiResult<LeaveHistoryResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.status) query.set("status", params.status);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<LeaveHistoryResponse>(`/api/leave/history${suffix}`);
  return response;
};

export const applyLeaveRequest = async (
  payload: LeaveApplyInput
): Promise<DashboardApiResult<LeaveApplyResponse>> => {
  if (payload.attachment instanceof File) {
    const formData = new FormData();
    formData.append("employeeId", payload.employeeId);
    formData.append("leave_type_id", payload.leave_type_id);
    formData.append("start_date", payload.start_date);
    formData.append("end_date", payload.end_date);
    if (payload.reason) {
      formData.append("reason", payload.reason);
    }
    if (payload.is_half_day) {
      formData.append("is_half_day", "true");
    }
    if (payload.half_day_type) {
      formData.append("half_day_type", payload.half_day_type);
    }
    formData.append("attachment", payload.attachment);

    const response = await fetch("/api/leave/apply", {
      method: "POST",
      headers: {
        "Idempotency-Key": crypto.randomUUID()
      },
      body: formData
    });

    const result = await parseJson<LeaveApplyResponse>(response);
    if (result.ok) {
      invalidateLeaveCache();
    }
    return result;
  }

  const { attachment: _attachment, ...body } = payload;
  const result = await postJson<LeaveApplyResponse>(
    "/api/leave/apply",
    body,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateLeaveCache();
  }
  return result;
};

export const cancelLeaveRequest = async (
  requestId: string,
  employeeId: string
): Promise<DashboardApiResult<LeaveCancelResponse>> => {
  const result = await postJson<LeaveCancelResponse>("/api/leave/cancel", { requestId, employeeId });
  if (result.ok) {
    invalidateLeaveCache();
  }
  return result;
};

export const fetchLeaveReviewQueue = async (params: {
  employeeId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<DashboardApiResult<LeaveReviewResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.status) query.set("status", params.status);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/leave/review/pending${suffix}`, { cache: "no-store" });
  return parseJson<LeaveReviewResponse>(response);
};

export const fetchLeaveReviewHistory = async (params: {
  employeeId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<DashboardApiResult<LeaveReviewResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.status) query.set("status", params.status);
  if (params.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params.dateTo) query.set("dateTo", params.dateTo);
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/leave/review/history${suffix}`, { cache: "no-store" });
  return parseJson<LeaveReviewResponse>(response);
};

export const approveLeaveRequest = async (
  requestId: string
): Promise<DashboardApiResult<LeaveDecisionResponse>> => {
  const result = await postJson<LeaveDecisionResponse>("/api/leave/review/approve", { requestId });
  if (result.ok) {
    invalidateLeaveCache();
  }
  return result;
};

export const rejectLeaveRequest = async (
  requestId: string,
  reason?: string
): Promise<DashboardApiResult<LeaveDecisionResponse>> => {
  const result = await postJson<LeaveDecisionResponse>("/api/leave/review/reject", { requestId, reason });
  if (result.ok) {
    invalidateLeaveCache();
  }
  return result;
};

export const fetchLeaveCalendar = async (params: {
  dateFrom: string;
  dateTo: string;
}): Promise<DashboardApiResult<LeaveCalendarResponse>> => {
  const query = new URLSearchParams({ dateFrom: params.dateFrom, dateTo: params.dateTo });
  const response = await fetchWithCache<LeaveCalendarResponse>(`/api/leave/calendar?${query.toString()}`);
  return response;
};

export const fetchUnifiedApprovals = async (): Promise<DashboardApiResult<ApprovalsResponse>> => {
  const response = await fetchWithCache<ApprovalsResponse>("/api/approvals/pending");
  return response;
};

export const fetchReliabilityOverview = async (): Promise<DashboardApiResult<ReliabilityOverview>> => {
  const response = await fetchWithCache<ReliabilityOverview>("/api/intelligence/reliability/overview");
  return response;
};

export const fetchEmployeeReliabilityCard = async (): Promise<DashboardApiResult<EmployeeReliabilityResponse>> => {
  const response = await fetchWithCache<EmployeeReliabilityResponse>("/api/intelligence/reliability/employee");
  return response;
};

export const fetchSupervisorFeedback = async (
  employeeId?: string
): Promise<DashboardApiResult<SupervisorFeedbackResponse>> => {
  const query = new URLSearchParams();
  if (employeeId) query.set("employeeId", employeeId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<SupervisorFeedbackResponse>(`/api/intelligence/feedback${suffix}`);
  return response;
};

export const submitSupervisorFeedback = async (
  payload: SupervisorFeedbackInput
): Promise<DashboardApiResult<{ id: string }>> => {
  return postJson<{ id: string }>("/api/intelligence/feedback", payload);
};

export const fetchKudosHistory = async (
  employeeId?: string
): Promise<DashboardApiResult<KudosHistoryResponse>> => {
  const query = new URLSearchParams();
  if (employeeId) query.set("employeeId", employeeId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<KudosHistoryResponse>(`/api/intelligence/kudos${suffix}`);
  return response;
};

export const sendKudos = async (
  payload: KudosInput
): Promise<DashboardApiResult<{ id: string }>> => {
  return postJson<{ id: string }>("/api/intelligence/kudos", payload);
};

export const fetchKudosLeaderboards = async (): Promise<DashboardApiResult<KudosLeaderboardResponse>> => {
  const response = await fetchWithCache<KudosLeaderboardResponse>("/api/intelligence/kudos/leaderboard");
  return response;
};

export const fetchMonitoringOverview = async (): Promise<DashboardApiResult<MonitoringOverview>> => {
  const response = await fetchWithCache<MonitoringOverview>("/api/monitoring/overview");
  return response;
};

export const fetchSecurityAuditTimeline = async (params: {
  limit?: number;
  eventType?: SecurityAuditTimelineEventType;
  from?: string;
  to?: string;
} = {}): Promise<DashboardApiResult<SecurityAuditTimelineResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (params.eventType) query.set("eventType", params.eventType);
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<SecurityAuditTimelineResponse>(`/api/monitoring/security-audit${suffix}`);
  return response;
};

export const cleanupIdempotencyExpired = async (
  endpoint?: string
): Promise<DashboardApiResult<IdempotencyCleanupResponse>> => {
  return postJson<IdempotencyCleanupResponse>("/api/monitoring/idempotency/cleanup", { endpoint });
};

export const fetchPayrollRuns = async (params: {
  status?: string;
  limit?: number;
} = {}): Promise<DashboardApiResult<PayrollRunsResponse>> => {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));

  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/payroll/runs${suffix}`, { cache: "no-store" });
  return parseJson<PayrollRunsResponse>(response);
};

export const runPayrollBatch = async (payload: {
  year: number;
  month: number;
}): Promise<DashboardApiResult<PayrollRunMutationResponse>> => {
  return postJson<PayrollRunMutationResponse>(
    "/api/payroll/run",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchPayrollRunDetail = async (
  runId: string
): Promise<DashboardApiResult<PayrollRunDetailResponse>> => {
  const response = await fetch(`/api/payroll/runs/${encodeURIComponent(runId)}`, { cache: "no-store" });
  return parseJson<PayrollRunDetailResponse>(response);
};

export const fetchPayslipHistory = async (params: {
  page?: number;
  pageSize?: number;
} = {}): Promise<DashboardApiResult<PayslipHistoryResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<PayslipHistoryResponse>(`/api/payslips${suffix}`);
  return response;
};

export const fetchPayslipDetail = async (
  entryId: string
): Promise<DashboardApiResult<PayslipDetailResponse>> => {
  const response = await fetchWithCache<PayslipDetailResponse>(`/api/payslips/${encodeURIComponent(entryId)}`);
  return response;
};

export const fetchPayrollRunTimeline = async (
  runId: string
): Promise<DashboardApiResult<PayrollRunTimelineResponse>> => {
  const response = await fetchWithCache<PayrollRunTimelineResponse>(`/api/payroll/runs/${encodeURIComponent(runId)}/timeline`);
  return response;
};

export const fetchPayrollRunDeliveryStatus = async (
  runId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<DashboardApiResult<PayrollRunDeliveryStatusResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<PayrollRunDeliveryStatusResponse>(`/api/payroll/runs/${encodeURIComponent(runId)}/delivery-status${suffix}`);
  return response;
};

export const markPayrollRunPaid = async (
  runId: string
): Promise<DashboardApiResult<PayrollLifecycleMutationResponse>> => {
  return postJson<PayrollLifecycleMutationResponse>(
    `/api/payroll/runs/${encodeURIComponent(runId)}/mark-paid`,
    {},
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const archivePayrollRun = async (
  runId: string
): Promise<DashboardApiResult<PayrollLifecycleMutationResponse>> => {
  return postJson<PayrollLifecycleMutationResponse>(
    `/api/payroll/runs/${encodeURIComponent(runId)}/archive`,
    {},
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const queuePayslipEmailDispatch = async (
  entryId: string
): Promise<DashboardApiResult<PayslipEmailDispatchResponse>> => {
  return postJson<PayslipEmailDispatchResponse>(
    `/api/payslips/${encodeURIComponent(entryId)}/email`,
    {},
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const queuePayrollRunPayslipEmails = async (
  runId: string
): Promise<DashboardApiResult<PayrollRunPayslipEmailBulkQueueResponse>> => {
  return postJson<PayrollRunPayslipEmailBulkQueueResponse>(
    `/api/payroll/runs/${encodeURIComponent(runId)}/payslips/email`,
    {},
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchPayrollCostTrend = async (params: {
  months?: number;
} = {}): Promise<DashboardApiResult<PayrollCostTrendPoint[]>> => {
  const query = new URLSearchParams();
  if (typeof params.months === "number") query.set("months", String(params.months));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/analytics/payroll/cost-trend${suffix}`, { cache: "no-store" });
  return parseJson<PayrollCostTrendPoint[]>(response);
};

export const fetchPayrollDeliveryMetrics = async (params: {
  months?: number;
} = {}): Promise<DashboardApiResult<PayrollDeliveryMetricsPoint[]>> => {
  const query = new URLSearchParams();
  if (typeof params.months === "number") query.set("months", String(params.months));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/analytics/payroll/delivery${suffix}`, { cache: "no-store" });
  return parseJson<PayrollDeliveryMetricsPoint[]>(response);
};

export const fetchPayrollCloseoutLatency = async (params: {
  months?: number;
} = {}): Promise<DashboardApiResult<PayrollCloseoutLatencyResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.months === "number") query.set("months", String(params.months));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/analytics/payroll/latency${suffix}`, { cache: "no-store" });
  return parseJson<PayrollCloseoutLatencyResponse>(response);
};

export const fetchPayrollGrowthMetrics = async (params: {
  months?: number;
} = {}): Promise<DashboardApiResult<PayrollGrowthMetricsResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.months === "number") query.set("months", String(params.months));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/analytics/payroll/growth${suffix}`, { cache: "no-store" });
  return parseJson<PayrollGrowthMetricsResponse>(response);
};

export const fetchBillingOverview = async (): Promise<DashboardApiResult<BillingOverview>> => {
  const response = await fetch("/api/billing/overview", { cache: "no-store" });
  return parseJson<BillingOverview>(response);
};

export const fetchBillingPlans = async (): Promise<DashboardApiResult<{ plans: BillingPlanCatalog[] }>> => {
  const response = await fetch("/api/billing/plans", { cache: "no-store" });
  return parseJson<{ plans: BillingPlanCatalog[] }>(response);
};

export const fetchBillingInvoices = async (params: {
  page?: number;
  pageSize?: number;
  status?: "draft" | "pending" | "under_review" | "paid" | "overdue" | "void";
} = {}): Promise<DashboardApiResult<BillingInvoiceList>> => {
  const query = new URLSearchParams();
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  if (params.status) query.set("status", params.status);
  const suffix = query.toString() ? "?" + query.toString() : "";
  const response = await fetch("/api/billing/invoices" + suffix, { cache: "no-store" });
  return parseJson<BillingInvoiceList>(response);
};

export const fetchBillingSeats = async (
  status?: "active" | "pending" | "revoked"
): Promise<DashboardApiResult<BillingSeatAssignmentList>> => {
  const suffix = status ? "?status=" + encodeURIComponent(status) : "";
  const response = await fetch("/api/billing/seats" + suffix, { cache: "no-store" });
  return parseJson<BillingSeatAssignmentList>(response);
};

export const bootstrapBillingTrial = async (): Promise<DashboardApiResult<BillingTrialBootstrapResult>> => {
  return postJson<BillingTrialBootstrapResult>(
    "/api/billing/trial/bootstrap",
    {},
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const assignBillingSeat = async (payload: {
  userProfileId: string;
  isBillable?: boolean;
}): Promise<DashboardApiResult<BillingSeatMutationResult>> => {
  return postJson<BillingSeatMutationResult>(
    "/api/billing/seats/assign",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const revokeBillingSeat = async (payload: {
  userProfileId: string;
}): Promise<DashboardApiResult<BillingSeatMutationResult>> => {
  return postJson<BillingSeatMutationResult>(
    "/api/billing/seats/revoke",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const generateBillingInvoice = async (payload: {
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string;
} = {}): Promise<DashboardApiResult<BillingInvoiceGenerationResult>> => {
  return postJson<BillingInvoiceGenerationResult>(
    "/api/billing/invoices/generate",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const markBillingInvoiceUnderReview = async (
  invoiceId: string,
  payload: { paymentReference?: string; paymentProvider?: string } = {}
): Promise<DashboardApiResult<BillingInvoiceTransitionResult>> => {
  return postJson<BillingInvoiceTransitionResult>(
    `/api/billing/invoices/${encodeURIComponent(invoiceId)}/under-review`,
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const markBillingInvoicePaid = async (
  invoiceId: string,
  payload: {
    paidAmountMinor: number;
    paidCurrencyCode: string;
    paymentReference?: string;
    paymentProvider?: string;
    paidAt?: string;
    approvalReason: string;
  }
): Promise<DashboardApiResult<BillingInvoiceTransitionResult>> => {
  return postJson<BillingInvoiceTransitionResult>(
    `/api/billing/invoices/${encodeURIComponent(invoiceId)}/mark-paid`,
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const processBillingWebhook = async (payload: {
  provider: string;
  providerEventId: string;
  eventType: string;
  payloadJson?: Record<string, unknown>;
  payloadHash?: string;
}): Promise<DashboardApiResult<BillingWebhookProcessResult>> => {
  return postJson<BillingWebhookProcessResult>(
    "/api/billing/webhooks/process",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const submitBillingPaymentProof = async (
  invoiceId: string,
  payload: {
    proofStoragePath: string;
    proofContentHash: string;
    amountMinor: number;
    currencyCode: string;
    referenceNumber: string;
    paymentMethod?: "bank_transfer" | "jazzcash" | "stripe" | "manual";
    paymentDate?: string;
    notes?: string;
    supersedesProofId?: string;
  }
): Promise<DashboardApiResult<BillingPaymentProofSubmitResult>> => {
  return postJson<BillingPaymentProofSubmitResult>(
    `/api/billing/invoices/${encodeURIComponent(invoiceId)}/proof`,
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchBillingPaymentProofs = async (
  invoiceId: string
): Promise<DashboardApiResult<BillingPaymentProofList>> => {
  const response = await fetch(`/api/billing/invoices/${encodeURIComponent(invoiceId)}/proofs`, { cache: "no-store" });
  return parseJson<BillingPaymentProofList>(response);
};

export const runBillingOverdueScheduler = async (): Promise<DashboardApiResult<BillingOverdueSchedulerResult>> => {
  return postJson<BillingOverdueSchedulerResult>(
    "/api/billing/scheduler/overdue",
    {},
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const requestBillingSubscriptionCancellation = async (
  payload: { reason?: string } = {}
): Promise<DashboardApiResult<BillingCancellationResult>> => {
  return postJson<BillingCancellationResult>(
    "/api/billing/subscription/cancel",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchPlatformOverview = async (): Promise<DashboardApiResult<PlatformOverviewResponse>> => {
  const response = await fetchWithCache<PlatformOverviewResponse>("/api/platform/overview", 45000);
  return response;
};

export const fetchWorkspaceResources = async (
  limit = 50
): Promise<DashboardApiResult<WorkspaceResourceListResponse>> => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  const response = await fetchWithCache<WorkspaceResourceListResponse>(`/api/workspace/resources?${query.toString()}`);
  return response;
};

export const fetchWorkspaceCalendar = async (
  month?: string
): Promise<DashboardApiResult<WorkspaceCalendarResponse>> => {
  const query = new URLSearchParams();
  if (month) query.set("month", month);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<WorkspaceCalendarResponse>(`/api/workspace/calendar${suffix}`);
  return response;
};

export const fetchWorkspaceNotes = async (
  limit = 50
): Promise<DashboardApiResult<WorkspaceNotesResponse>> => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  const response = await fetchWithCache<WorkspaceNotesResponse>(`/api/workspace/notes?${query.toString()}`);
  return response;
};

const invalidateWorkspaceNotesCache = (): void => {
  invalidateCachedUrls([
    "/api/workspace/notes?limit=20",
    "/api/workspace/notes?limit=50",
  ]);
};

export const createWorkspaceNote = async (payload: {
  title: string;
  body: string;
  fileUrl?: string | null;
  fileName?: string | null;
  isPinned?: boolean;
}): Promise<DashboardApiResult<WorkspaceCreateNoteResponse>> => {
  const result = await postJson<WorkspaceCreateNoteResponse>(
    "/api/workspace/notes",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateWorkspaceNotesCache();
  }
  return result;
};

export const updateWorkspaceNote = async (
  noteId: string,
  payload: {
    title: string;
    body: string;
    fileUrl?: string | null;
    fileName?: string | null;
    isPinned?: boolean;
  }
): Promise<DashboardApiResult<{ id: string }>> => {
  const result = await postJson<{ id: string }>(
    `/api/workspace/notes/${encodeURIComponent(noteId)}`,
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateWorkspaceNotesCache();
  }
  return result;
};

export const deleteWorkspaceNote = async (
  noteId: string
): Promise<DashboardApiResult<{ id: string }>> => {
  const response = await fetch(`/api/workspace/notes/${encodeURIComponent(noteId)}`, {
    method: "DELETE",
    headers: {
      "Idempotency-Key": crypto.randomUUID(),
    },
  });
  const result = await parseJson<{ id: string }>(response);
  if (result.ok) {
    invalidateWorkspaceNotesCache();
  }
  return result;
};

export const fetchWorkspaceChat = async (params: {
  peerEmployeeId?: string;
  limit?: number;
} = {}): Promise<DashboardApiResult<WorkspaceChatResponse>> => {
  const query = new URLSearchParams();
  if (params.peerEmployeeId) query.set("peerEmployeeId", params.peerEmployeeId);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<WorkspaceChatResponse>(`/api/workspace/chat${suffix}`);
  return response;
};

export const sendWorkspaceChat = async (payload: {
  recipientEmployeeId: string;
  message: string;
}): Promise<DashboardApiResult<WorkspaceSendChatResponse>> => {
  const result = await postJson<WorkspaceSendChatResponse>(
    "/api/workspace/chat",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateCachedUrlPrefix("/api/workspace/chat");
    invalidateCachedUrlPrefix("/api/workspace/contacts");
    invalidateCachedUrls(["/api/dashboard/employee", "/api/dashboard/manager"]);
  }
  return result;
};

export const fetchWorkspaceContacts = async (
  limit = 200
): Promise<DashboardApiResult<WorkspaceContactsResponse>> => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  const response = await fetchWithCache<WorkspaceContactsResponse>(`/api/workspace/contacts?${query.toString()}`);
  return response;
};

export const fetchWorkspaceNotifications = async (params: {
  limit?: number;
  unreadOnly?: boolean;
} = {}): Promise<DashboardApiResult<WorkspaceNotificationsResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (params.unreadOnly) query.set("unreadOnly", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<WorkspaceNotificationsResponse>(`/api/workspace/notifications${suffix}`);
  return response;
};

export const markWorkspaceNotificationsRead = async (payload: {
  ids?: string[];
} = {}): Promise<DashboardApiResult<WorkspaceMarkNotificationsReadResponse>> => {
  return postJson<WorkspaceMarkNotificationsReadResponse>(
    "/api/workspace/notifications",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchMyFinancialObligationRequests = async (): Promise<DashboardApiResult<MyFinancialObligationRequestsResponse>> => {
  const response = await fetchWithCache<MyFinancialObligationRequestsResponse>("/api/finance/obligations/requests/mine");
  return response;
};

export const submitLoanRequest = async (payload: {
  amount: number;
  termMonths: number;
  currencyCode: string;
  reason?: string;
}): Promise<DashboardApiResult<SubmitFinancialObligationRequestResponse>> => {
  return postJson<SubmitFinancialObligationRequestResponse>(
    "/api/finance/loans/request",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const submitAdvanceRequest = async (payload: {
  amount: number;
  currencyCode: string;
  reason?: string;
}): Promise<DashboardApiResult<SubmitFinancialObligationRequestResponse>> => {
  return postJson<SubmitFinancialObligationRequestResponse>(
    "/api/finance/advances/request",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchShiftTemplates = async (): Promise<DashboardApiResult<ShiftTemplatesResponse>> => {
  const response = await fetchWithCache<ShiftTemplatesResponse>("/api/attendance/shifts/templates");
  return response;
};

export const fetchShiftAssignableEmployees = async (
  limit = 200
): Promise<DashboardApiResult<ShiftAssignableEmployeesResponse>> => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  const response = await fetchWithCache<ShiftAssignableEmployeesResponse>(`/api/attendance/shifts/assignable?${query.toString()}`);
  return response;
};

export const fetchShiftAssignments = async (params: {
  employeeId?: string;
  limit?: number;
} = {}): Promise<DashboardApiResult<ShiftAssignmentsResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<ShiftAssignmentsResponse>(`/api/attendance/shifts/assignments${suffix}`);
  return response;
};

export const assignShift = async (payload: {
  employeeId: string;
  shiftTemplateId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}): Promise<DashboardApiResult<AssignShiftResponse>> => {
  const result = await postJson<AssignShiftResponse>(
    "/api/attendance/shifts/assign",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const updateShiftAssignment = async (
  assignmentId: string,
  payload: {
    shiftTemplateId: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }
): Promise<DashboardApiResult<UpdateShiftAssignmentResponse>> => {
  const response = await fetch(`/api/attendance/shifts/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<UpdateShiftAssignmentResponse>(response);
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const removeShiftAssignment = async (
  assignmentId: string
): Promise<DashboardApiResult<RemoveShiftAssignmentResponse>> => {
  const response = await fetch(`/api/attendance/shifts/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "DELETE",
    headers: {
      "Idempotency-Key": crypto.randomUUID(),
    },
  });
  const result = await parseJson<RemoveShiftAssignmentResponse>(response);
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const fetchBreakAssignments = async (params: {
  employeeId?: string;
  limit?: number;
} = {}): Promise<DashboardApiResult<BreakAssignmentsResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return fetchWithCache<BreakAssignmentsResponse>(`/api/attendance/breaks/assignments${suffix}`);
};

export const assignBreak = async (payload: {
  employeeId: string;
  breakName?: string | null;
  breakStartTime: string;
  breakEndTime: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}): Promise<DashboardApiResult<AssignBreakResponse>> => {
  const result = await postJson<AssignBreakResponse>(
    "/api/attendance/breaks/assign",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const updateBreakAssignment = async (
  assignmentId: string,
  payload: {
    breakName?: string | null;
    breakStartTime: string;
    breakEndTime: string;
    effectiveFrom: string;
    effectiveTo?: string | null;
  }
): Promise<DashboardApiResult<UpdateBreakAssignmentResponse>> => {
  const response = await fetch(`/api/attendance/breaks/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });
  const result = await parseJson<UpdateBreakAssignmentResponse>(response);
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const removeBreakAssignment = async (
  assignmentId: string
): Promise<DashboardApiResult<RemoveBreakAssignmentResponse>> => {
  const response = await fetch(`/api/attendance/breaks/assignments/${encodeURIComponent(assignmentId)}`, {
    method: "DELETE",
    headers: {
      "Idempotency-Key": crypto.randomUUID(),
    },
  });
  const result = await parseJson<RemoveBreakAssignmentResponse>(response);
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const fetchShiftSwapRequests = async (params: {
  scope?: "mine" | "review";
  status?: "pending_team_lead" | "pending_hr" | "approved" | "rejected";
  limit?: number;
} = {}): Promise<DashboardApiResult<ShiftSwapRequestsResponse>> => {
  const query = new URLSearchParams();
  if (params.scope) query.set("scope", params.scope);
  if (params.status) query.set("status", params.status);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetchWithCache<ShiftSwapRequestsResponse>(`/api/attendance/shift-swaps${suffix}`);
  return response;
};

export const requestShiftSwap = async (payload: {
  attendanceDate: string;
  requestedShiftTemplateId: string;
  reason: string;
  requestMode?: "shift_change" | "swap_with_agent";
  targetEmployeeId?: string;
}): Promise<DashboardApiResult<ShiftSwapCreateResponse>> => {
  const result = await postJson<ShiftSwapCreateResponse>(
    "/api/attendance/shift-swaps",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const reviewShiftSwap = async (payload: {
  requestId: string;
  decision: "approved" | "rejected";
  note?: string;
}): Promise<DashboardApiResult<ShiftSwapReviewResponse>> => {
  const result = await postJson<ShiftSwapReviewResponse>(
    "/api/attendance/shift-swaps/review",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
  if (result.ok) {
    invalidateShiftWorkspaceCache();
  }
  return result;
};

export const fetchShiftChangeCandidates = async (params: {
  attendanceDate: string;
  query?: string;
  limit?: number;
}): Promise<DashboardApiResult<ShiftChangeCandidatesResponse>> => {
  const query = new URLSearchParams();
  query.set("attendanceDate", params.attendanceDate);
  if (params.query) query.set("query", params.query);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const response = await fetchWithCache<ShiftChangeCandidatesResponse>(`/api/attendance/shift-swaps/candidates?${query.toString()}`, 30000);
  return response;
};




type DashboardPrewarmPersona = "employee" | "manager" | "admin_ops" | "finance" | "executive" | "platform_owner";

const settlePrewarm = (tasks: Array<Promise<unknown>>): void => {
  if (tasks.length === 0) return;
  void Promise.allSettled(tasks);
};

const resolveMonthRange = (month: string): { dateFrom: string; dateTo: string } => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthPart = Number(monthText);

  if (!Number.isFinite(year) || !Number.isFinite(monthPart)) {
    return {
      dateFrom: `${month}-01`,
      dateTo: `${month}-31`
    };
  }

  const daysInMonth = new Date(Date.UTC(year, monthPart, 0)).getUTCDate();
  return {
    dateFrom: `${month}-01`,
    dateTo: `${month}-${String(daysInMonth).padStart(2, "0")}`
  };
};

export const prewarmRouteData = (href: string): void => {
  const month = new Date().toISOString().slice(0, 7);
  const monthRange = resolveMonthRange(month);
  const path = href.split("?")[0] ?? href;
  const tasks: Array<Promise<unknown>> = [];

  if (path === "/app/dashboard") {
    tasks.push(fetchEmployeeDashboard());
  }

  if (path === "/app/profile") {
    tasks.push(
      fetchEmployeeMe().then((me) => {
        if (!me.ok || !me.data?.employeeId) return null;
        return fetchEmployeeProfile(me.data.employeeId);
      })
    );
    tasks.push(fetchEmployeeLookups());
  }

  if (path === "/app/attendance") {
    tasks.push(fetchAttendanceToday());
    tasks.push(fetchAttendanceHistory({ page: 1, pageSize: 10 }));
  }

  if (path === "/app/attendance/shift-swaps") {
    tasks.push(fetchShiftSwapRequests({ scope: "mine", limit: 30 }));
    tasks.push(fetchShiftTemplates());
  }

  if (path === "/app/leave") {
    tasks.push(fetchLeaveBalances());
    tasks.push(fetchLeaveTypes());
    tasks.push(fetchLeaveHistory({ page: 1, pageSize: 10 }));
  }

  if (path === "/app/calendar") {
    tasks.push(fetchWorkspaceCalendar(month));
    tasks.push(fetchLeaveCalendar(monthRange));
  }

  if (path === "/app/resources") {
    tasks.push(fetchWorkspaceResources(25));
  }

  if (path === "/app/notes") {
    tasks.push(fetchWorkspaceNotes(20));
  }

  if (path === "/app/chat") {
    tasks.push(fetchWorkspaceContacts(200));
    tasks.push(fetchWorkspaceChat({ limit: 30 }));
  }

  if (path === "/app/notifications") {
    tasks.push(fetchWorkspaceNotifications({ limit: 40 }));
  }

  if (path === "/app/payslips") {
    tasks.push(fetchPayslipHistory({ page: 1, pageSize: 10 }));
  }

  if (path === "/app/overtime") {
    tasks.push(fetchOvertimeRequests({}));
  }

  if (path === "/app/intelligence/kudos") {
    tasks.push(fetchKudosHistory());
    tasks.push(fetchKudosLeaderboards());
  }

  settlePrewarm(tasks);
};

export const prewarmDashboardData = (persona: DashboardPrewarmPersona): void => {
  const month = new Date().toISOString().slice(0, 7);
  const monthRange = resolveMonthRange(month);
  const phaseOne: Array<Promise<unknown>> = [];

  if (persona === "employee" || persona === "manager") {
    phaseOne.push(fetchEmployeeMe());
    phaseOne.push(fetchAttendanceToday());
    phaseOne.push(fetchWorkspaceNotifications({ limit: 30 }));
  }

  if (persona === "manager") {
    phaseOne.push(fetchManagerDashboard());
  }

  if (persona === "admin_ops" || persona === "executive") {
    phaseOne.push(fetchAdminDashboard());
  }

  if (persona === "admin_ops" || persona === "finance" || persona === "executive") {
    phaseOne.push(fetchMonitoringOverview());
    phaseOne.push(fetchBillingOverview());
  }

  if (persona === "platform_owner") {
    phaseOne.push(fetchPlatformOverview());
  }

  settlePrewarm(phaseOne);

  const runPhaseTwo = () => {
    const phaseTwo: Array<Promise<unknown>> = [];

    if (persona === "employee" || persona === "manager") {
      phaseTwo.push(fetchEmployeeDashboard());
      phaseTwo.push(fetchWorkspaceResources(20));
      phaseTwo.push(fetchWorkspaceNotes(20));
      phaseTwo.push(fetchWorkspaceCalendar(month));
      phaseTwo.push(fetchLeaveBalances());
      phaseTwo.push(fetchLeaveTypes());
      phaseTwo.push(fetchLeaveHistory({ page: 1, pageSize: 10 }));
      phaseTwo.push(fetchShiftSwapRequests({ scope: "mine", limit: 30 }));
      phaseTwo.push(fetchWorkspaceChat({ limit: 20 }));
      phaseTwo.push(fetchWorkspaceContacts(200));
    }

    if (persona === "manager") {
      phaseTwo.push(fetchLeaveCalendar(monthRange));
    }

    if (persona === "admin_ops" || persona === "finance" || persona === "executive") {
      phaseTwo.push(fetchMonitoringOverview());
      phaseTwo.push(fetchBillingOverview());
      phaseTwo.push(fetchWorkspaceNotifications({ limit: 30 }));
    }

    if (persona === "employee") {
      phaseTwo.push(fetchEmployeeLookups());
      phaseTwo.push(fetchKudosHistory());
      phaseTwo.push(fetchKudosLeaderboards());
      phaseTwo.push(fetchPayslipHistory({ page: 1, pageSize: 10 }));
    }

    settlePrewarm(phaseTwo);
  };

  if (typeof window === "undefined") {
    runPhaseTwo();
    return;
  }

  const requestIdleCallbackFn = (window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;

  if (typeof requestIdleCallbackFn === "function") {
    requestIdleCallbackFn(runPhaseTwo, { timeout: 900 });
  } else {
    window.setTimeout(runPhaseTwo, 260);
  }
};





