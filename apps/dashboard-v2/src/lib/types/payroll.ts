export type PayrollRunRow = {
  id: string;
  company_id: string;
  month: number;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  locked: boolean;
  locked_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PayrollRunsResponse = {
  rows: PayrollRunRow[];
};

export type PayrollRunMutationResponse = {
  payrollRunId: string;
};

export type PayrollLifecycleMutationResponse = {
  payrollRunId: string;
  status: "paid" | "archived";
};

export type PayrollRunEntryRow = {
  id: string;
  employee_id: string;
  employee_code: string | null;
  employee_name: string | null;
  base_salary: number | null;
  base_salary_snapshot: number | null;
  total_earnings: number | null;
  total_allowances: number | null;
  total_deductions: number | null;
  net_salary: number | null;
  is_processed: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PayrollRunDetailResponse = {
  run: PayrollRunRow;
  entries: PayrollRunEntryRow[];
  summary: {
    headcount: number;
    processedCount: number;
    totalEarnings: number;
    totalAllowances: number;
    totalDeductions: number;
    totalNet: number;
  };
};

export type PayslipHistoryRow = {
  entryId: string;
  payrollRunId: string;
  period: string;
  employeeId: string;
  employeeName: string;
  netSalary: number;
  status: string;
  isLocked: boolean;
  processedAt: string;
};

export type PayslipHistoryResponse = {
  rows: PayslipHistoryRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  viewerScope: "manage_payroll" | "self";
};

export type PayslipDetailResponse = {
  entryId: string;
  period: string;
  employee: {
    id: string;
    name: string;
    code?: string;
  };
  earnings: Array<{ label: string; amount: number }>;
  deductions: Array<{ label: string; amount: number }>;
  totals: {
    gross: number;
    deductions: number;
    net: number;
  };
  status: string;
  isLocked: boolean;
  processedAt: string;
};

export type PayslipEmailDispatchResponse = {
  queueId: string;
  entryId: string;
  payrollRunId?: string;
  queueStatus?: "queued" | "existing_pending";
};

export type PayrollLifecycleState =
  | "DRAFT"
  | "PROCESSING"
  | "CALCULATED"
  | "FINALIZED"
  | "LOCKED"
  | "PAID"
  | "ARCHIVED";

export type PayrollLifecycleMetadata = {
  currentState: PayrollLifecycleState;
  isMutable: boolean;
  isFinanciallyCommitted: boolean;
  isLocked: boolean;
  isVisibleToEmployees: boolean;
};

export type PayrollRunTimelineResponse = {
  runId: string;
  lifecycle: {
    createdAt: string | null;
    calculatedAt?: string | null;
    finalizedAt?: string | null;
    lockedAt?: string | null;
    paidAt?: string | null;
  };
  currentState: PayrollLifecycleState;
  stateMetadata: PayrollLifecycleMetadata;
  actorHistory: Array<{ action: string; performedBy: string | null; timestamp: string }>;
};

export type PayrollRunDeliveryStatusRow = {
  dispatchId: string;
  queueId: string;
  entryId: string;
  employeeId: string;
  employeeName: string;
  employeeCode?: string | null;
  queueStatus: string;
  retryCount: number;
  queuedAt: string;
  updatedAt: string;
  queuedBy: string | null;
};

export type PayrollRunDeliveryStatusResponse = {
  runId: string;
  period: string;
  runStatus: string;
  isLocked: boolean;
  summary: {
    entriesTotal: number;
    entriesWithDispatch: number;
    pendingEntries: number;
    sentEntries: number;
    failedEntries: number;
    totalDispatchAttempts: number;
  };
  rows: PayrollRunDeliveryStatusRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type PayrollRunPayslipEmailBulkQueueResponse = {
  runId: string;
  queued: number;
  alreadyQueued: number;
  failed: number;
  totalEntries: number;
  processedEntries: number;
  errors: Array<{ entryId: string; message: string }>;
};

export type PayrollAnalyticsRange = {
  months?: number;
};

export type PayrollCostTrendPoint = {
  year: number;
  month: number;
  grossTotal: number;
  netTotal: number;
  employeeCount: number;
  deltaFromPrevious: number | null;
  percentGrowth: number | null;
};

export type PayrollDeliveryMetricsPoint = {
  runId: string;
  year: number;
  month: number;
  totalDispatches: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
  lastActivityAt: string | null;
};

export type PayrollCloseoutLatencyPoint = {
  runId: string;
  year: number;
  month: number;
  finalizeToPaidHours: number | null;
  paidToArchivedHours: number | null;
};

export type PayrollCloseoutLatencyResponse = {
  rows: PayrollCloseoutLatencyPoint[];
  summary: {
    avgFinalizeToPaid: number | null;
    avgPaidToArchived: number | null;
    p50FinalizeToPaid: number | null;
    p95FinalizeToPaid: number | null;
  };
};

export type PayrollGrowthMetricsResponse = {
  currentMonthNet: number;
  previousMonthNet: number;
  absoluteDelta: number;
  percentGrowth: number | null;
};
