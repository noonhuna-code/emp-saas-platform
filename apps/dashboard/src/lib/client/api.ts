import type { DashboardApiResult } from "@/lib/types/api";
import type { DashboardSession } from "@/lib/types/auth";
import type {
  AttendanceCorrectionRequestInput,
  AttendanceCorrectionRequestResponse,
  AttendanceCorrectionReviewMutationResponse,
  AttendanceHistoryResponse,
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
  LeaveReviewResponse
} from "@/lib/types/leave";
import type { ApprovalsResponse } from "@/lib/types/approvals";
import type { IdempotencyCleanupResponse, MonitoringOverview } from "@/lib/types/monitoring";
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
  AssignShiftResponse,
  ShiftAssignableEmployeesResponse,
  ShiftAssignmentsResponse,
  ShiftTemplatesResponse,
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
import type {
  MyFinancialObligationRequestsResponse,
  SubmitFinancialObligationRequestResponse
} from "@/lib/types/finance";

const parseJson = async <T>(response: Response): Promise<DashboardApiResult<T>> => {
  const payload = (await response.json()) as DashboardApiResult<T>;
  return payload;
};


type CacheEntry<T> = { ts: number; value?: DashboardApiResult<T>; promise?: Promise<DashboardApiResult<T>> };
const GET_CACHE = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 15000;

const fetchWithCache = async <T>(url: string, ttlMs: number = DEFAULT_TTL): Promise<DashboardApiResult<T>> => {
  const now = Date.now();
  const existing = GET_CACHE.get(url) as CacheEntry<T> | undefined;
  if (existing?.value) {
    if (!existing.promise && now - existing.ts >= ttlMs) {
      const refreshPromise = fetch(url, { cache: "no-store" })
        .then(parseJson<T>)
        .then((result) => {
          GET_CACHE.set(url, { ts: Date.now(), value: result });
          return result;
        })
        .finally(() => {
          const entry = GET_CACHE.get(url);
          if (entry) entry.promise = undefined;
        });
      GET_CACHE.set(url, { ts: existing.ts, value: existing.value, promise: refreshPromise });
    }
    return existing.value;
  }
  if (existing?.promise) {
    return existing.promise;
  }

  const promise = fetch(url, { cache: "no-store" })
    .then(parseJson<T>)
    .then((result) => {
      GET_CACHE.set(url, { ts: Date.now(), value: result });
      return result;
    })
    .finally(() => {
      const entry = GET_CACHE.get(url);
      if (entry) entry.promise = undefined;
    });

  GET_CACHE.set(url, { ts: now, promise });
  return promise;
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
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  return parseJson<DashboardSession>(response);
};

export const fetchEmployees = async (params: {
  departmentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<DashboardApiResult<EmployeeListResponse>> => {
  const query = new URLSearchParams();
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
  const response = await fetch("/api/employees/me", { cache: "no-store" });
  return parseJson<{ employeeId: string }>(response);
};
export const fetchCurrentEmployeeId = async (): Promise<DashboardApiResult<{ employeeId: string }>> => {
  const response = await fetch("/api/employees/me", { cache: "no-store" });
  return parseJson<{ employeeId: string }>(response);
};

export const fetchEmployeeProfile = async (
  employeeId: string
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const response = await fetch(`/api/employees/${employeeId}/profile`, { cache: "no-store" });
  return parseJson<EmployeeProfileResponse>(response);
};

export const fetchEmployeeLookups = async (): Promise<DashboardApiResult<EmployeeLookupResponse>> => {
  const response = await fetch("/api/employees/lookups", { cache: "no-store" });
  return parseJson<EmployeeLookupResponse>(response);
};

export const updatePersonalDetails = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/personal`, payload);
};

export const updateEmploymentInfo = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/employment`, payload);
};

export const updateSensitiveData = async (
  employeeId: string,
  payload: Record<string, unknown>
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  return postJson<EmployeeProfileResponse>(`/api/employees/${employeeId}/sensitive`, payload);
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
): Promise<DashboardApiResult<EmployeeProfileResponse>> => {
  const response = await fetch(`/api/employees/${employeeId}/documents/${documentId}`, {
    method: "DELETE"
  });
  return parseJson<EmployeeProfileResponse>(response);
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

export const fetchEmployeeDashboard = async (): Promise<DashboardApiResult<EmployeeDashboardResponse>> => {
  const response = await fetchWithCache<EmployeeDashboardResponse>("/api/dashboard/employee");
  return response;
};

export const fetchManagerDashboard = async (): Promise<DashboardApiResult<ManagerDashboardResponse>> => {
  const response = await fetch("/api/dashboard/manager", { cache: "no-store" });
  return parseJson<ManagerDashboardResponse>(response);
};

export const fetchAdminDashboard = async (): Promise<DashboardApiResult<AdminDashboardResponse>> => {
  const response = await fetch("/api/dashboard/admin", { cache: "no-store" });
  return parseJson<AdminDashboardResponse>(response);
};

export const fetchOvertimeRequests = async (params: {
  employeeId?: string;
  status?: string;
} = {}): Promise<DashboardApiResult<OvertimeListResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (params.status) query.set("status", params.status);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/overtime/list${suffix}`, { cache: "no-store" });
  return parseJson<OvertimeListResponse>(response);
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
  const response = await fetch("/api/org-chart", { cache: "no-store" });
  return parseJson<OrgChartResponse>(response);
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
  return postJson<AttendanceCorrectionRequestResponse>("/api/attendance/correction-request", payload);
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
  return postJson<LeaveApplyResponse>("/api/leave/apply", payload);
};

export const cancelLeaveRequest = async (
  requestId: string,
  employeeId: string
): Promise<DashboardApiResult<LeaveCancelResponse>> => {
  return postJson<LeaveCancelResponse>("/api/leave/cancel", { requestId, employeeId });
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
  return postJson<LeaveDecisionResponse>("/api/leave/review/approve", { requestId });
};

export const rejectLeaveRequest = async (
  requestId: string,
  reason?: string
): Promise<DashboardApiResult<LeaveDecisionResponse>> => {
  return postJson<LeaveDecisionResponse>("/api/leave/review/reject", { requestId, reason });
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
  const response = await fetch("/api/approvals/pending", { cache: "no-store" });
  return parseJson<ApprovalsResponse>(response);
};

export const fetchReliabilityOverview = async (): Promise<DashboardApiResult<ReliabilityOverview>> => {
  const response = await fetch("/api/intelligence/reliability/overview", { cache: "no-store" });
  return parseJson<ReliabilityOverview>(response);
};

export const fetchEmployeeReliabilityCard = async (): Promise<DashboardApiResult<EmployeeReliabilityResponse>> => {
  const response = await fetch("/api/intelligence/reliability/employee", { cache: "no-store" });
  return parseJson<EmployeeReliabilityResponse>(response);
};

export const fetchSupervisorFeedback = async (
  employeeId?: string
): Promise<DashboardApiResult<SupervisorFeedbackResponse>> => {
  const query = new URLSearchParams();
  if (employeeId) query.set("employeeId", employeeId);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/intelligence/feedback${suffix}`, { cache: "no-store" });
  return parseJson<SupervisorFeedbackResponse>(response);
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
  const response = await fetch(`/api/intelligence/kudos${suffix}`, { cache: "no-store" });
  return parseJson<KudosHistoryResponse>(response);
};

export const sendKudos = async (
  payload: KudosInput
): Promise<DashboardApiResult<{ id: string }>> => {
  return postJson<{ id: string }>("/api/intelligence/kudos", payload);
};

export const fetchKudosLeaderboards = async (): Promise<DashboardApiResult<KudosLeaderboardResponse>> => {
  const response = await fetch("/api/intelligence/kudos/leaderboard", { cache: "no-store" });
  return parseJson<KudosLeaderboardResponse>(response);
};

export const fetchMonitoringOverview = async (): Promise<DashboardApiResult<MonitoringOverview>> => {
  const response = await fetch("/api/monitoring/overview", { cache: "no-store" });
  return parseJson<MonitoringOverview>(response);
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
  const response = await fetch(`/api/payslips${suffix}`, { cache: "no-store" });
  return parseJson<PayslipHistoryResponse>(response);
};

export const fetchPayslipDetail = async (
  entryId: string
): Promise<DashboardApiResult<PayslipDetailResponse>> => {
  const response = await fetch(`/api/payslips/${encodeURIComponent(entryId)}`, { cache: "no-store" });
  return parseJson<PayslipDetailResponse>(response);
};

export const fetchPayrollRunTimeline = async (
  runId: string
): Promise<DashboardApiResult<PayrollRunTimelineResponse>> => {
  const response = await fetch(`/api/payroll/runs/${encodeURIComponent(runId)}/timeline`, { cache: "no-store" });
  return parseJson<PayrollRunTimelineResponse>(response);
};

export const fetchPayrollRunDeliveryStatus = async (
  runId: string,
  params: { page?: number; pageSize?: number } = {}
): Promise<DashboardApiResult<PayrollRunDeliveryStatusResponse>> => {
  const query = new URLSearchParams();
  if (typeof params.page === "number") query.set("page", String(params.page));
  if (typeof params.pageSize === "number") query.set("pageSize", String(params.pageSize));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/payroll/runs/${encodeURIComponent(runId)}/delivery-status${suffix}`, { cache: "no-store" });
  return parseJson<PayrollRunDeliveryStatusResponse>(response);
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
  const response = await fetch("/api/platform/overview", { cache: "no-store" });
  return parseJson<PlatformOverviewResponse>(response);
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
  const response = await fetch(`/api/workspace/notes?${query.toString()}`, { cache: "no-store" });
  return parseJson<WorkspaceNotesResponse>(response);
};

export const createWorkspaceNote = async (payload: {
  title: string;
  body: string;
  fileUrl?: string | null;
  fileName?: string | null;
  isPinned?: boolean;
}): Promise<DashboardApiResult<WorkspaceCreateNoteResponse>> => {
  return postJson<WorkspaceCreateNoteResponse>(
    "/api/workspace/notes",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
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
  return postJson<WorkspaceSendChatResponse>(
    "/api/workspace/chat",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchWorkspaceContacts = async (
  limit = 200
): Promise<DashboardApiResult<WorkspaceContactsResponse>> => {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  const response = await fetch(`/api/workspace/contacts?${query.toString()}`, { cache: "no-store" });
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
  const response = await fetch("/api/finance/obligations/requests/mine", { cache: "no-store" });
  return parseJson<MyFinancialObligationRequestsResponse>(response);
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
  const response = await fetch(`/api/attendance/shifts/assignable?${query.toString()}`, { cache: "no-store" });
  return parseJson<ShiftAssignableEmployeesResponse>(response);
};

export const fetchShiftAssignments = async (params: {
  employeeId?: string;
  limit?: number;
} = {}): Promise<DashboardApiResult<ShiftAssignmentsResponse>> => {
  const query = new URLSearchParams();
  if (params.employeeId) query.set("employeeId", params.employeeId);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  const response = await fetch(`/api/attendance/shifts/assignments${suffix}`, { cache: "no-store" });
  return parseJson<ShiftAssignmentsResponse>(response);
};

export const assignShift = async (payload: {
  employeeId: string;
  shiftTemplateId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
}): Promise<DashboardApiResult<AssignShiftResponse>> => {
  return postJson<AssignShiftResponse>(
    "/api/attendance/shifts/assign",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const fetchShiftSwapRequests = async (params: {
  scope?: "mine" | "review";
  status?: "pending" | "approved" | "rejected";
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
}): Promise<DashboardApiResult<ShiftSwapCreateResponse>> => {
  return postJson<ShiftSwapCreateResponse>(
    "/api/attendance/shift-swaps",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};

export const reviewShiftSwap = async (payload: {
  requestId: string;
  decision: "approved" | "rejected";
  note?: string;
}): Promise<DashboardApiResult<ShiftSwapReviewResponse>> => {
  return postJson<ShiftSwapReviewResponse>(
    "/api/attendance/shift-swaps/review",
    payload as Record<string, unknown>,
    { "Idempotency-Key": crypto.randomUUID() }
  );
};


