export type OvertimeRequest = {
  id: string;
  company_id: string;
  employee_id: string;
  attendance_id?: string | null;
  request_date: string;
  requested_minutes: number;
  reason: string;
  status: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  created_at?: string | null;
};

export type OvertimeListResponse = {
  rows: OvertimeRequest[];
};

export type OvertimeRequestInput = {
  employeeId?: string;
  attendanceId?: string | null;
  requestDate: string;
  requestedMinutes: number;
  reason: string;
};

export type OvertimeRequestResponse = {
  request: OvertimeRequest;
};

export type OvertimeDecisionResponse = {
  request: OvertimeRequest;
};
