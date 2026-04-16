export type RateLimitBreach = {
  endpoint: string;
  window_start: string;
  request_count: number;
};

export type IdempotencyConflict = {
  endpoint: string;
  count: number;
};

export type ApprovalFailure = {
  endpoint: string;
  count: number;
};

export type MonitoringOverview = {
  rateLimitBreaches: RateLimitBreach[];
  idempotencyConflicts: IdempotencyConflict[];
  approvalFailures: ApprovalFailure[];
  generated_at: string;
};

export type IdempotencyCleanupResponse = {
  expired: number;
};

export type SecurityAuditTimelineEventType = "login" | "account_lock" | "mfa_trigger";

export type SecurityAuditTimelineRow = {
  eventType: SecurityAuditTimelineEventType;
  createdAt: string;
  riskScore: number | null;
  profileId: string | null;
  summary: string;
  details: Record<string, unknown> | null;
};

export type SecurityAuditTimelineResponse = {
  rows: SecurityAuditTimelineRow[];
};
