export type AttendanceTodayRecord = {
  id: string;
  attendance_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes: number | null;
  shift_start_time: string | null;
  shift_end_time: string | null;
  early_logout: boolean | null;
  missing_logout: boolean | null;
  is_locked: boolean;
  correction_status: string | null;
};

export type AttendanceTodayResponse = {
  employeeId: string;
  todayDate: string;
  currentStatus: "not_clocked_in" | "clocked_in" | "on_break" | "clocked_out";
  isOnBreak: boolean;
  latestGeoEvent: {
    event_type: string;
    latitude: number;
    longitude: number;
    accuracy_meters: number | null;
    source: string | null;
    captured_at: string;
  } | null;
  record: AttendanceTodayRecord | null;
};

export type AttendanceHistoryRow = {
  id: string;
  attendance_date: string;
  shift_start_time: string | null;
  shift_end_time: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes: number | null;
  is_late: boolean;
  is_absent: boolean;
  is_locked: boolean;
  correction_status: string | null;
  latest_correction_id: string | null;
};

export type AttendanceHistoryResponse = {
  employeeId: string;
  rows: AttendanceHistoryRow[];
  page: number;
  pageSize: number;
  total: number;
};

export type AttendanceCorrectionRequestInput = {
  attendanceId: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason: string;
  note?: string | null;
};

export type AttendanceCorrectionRequestResponse = {
  requestId: string;
};

export type AttendanceReviewRow = {
  id: string;
  company_id: string;
  attendance_id: string;
  requested_check_in: string | null;
  requested_check_out: string | null;
  reason: string;
  rejection_reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  attendance: {
    id: string;
    employee_id: string;
    attendance_date: string | null;
    check_in: string | null;
    check_out: string | null;
  } | null;
  employee: {
    id: string;
    user_profile_id: string | null;
    full_name: string | null;
    department_id: string | null;
    team_id: string | null;
  } | null;
};

export type AttendanceReviewListResponse = {
  rows: AttendanceReviewRow[];
};

export type AttendanceCorrectionReviewMutationResponse = {
  correction: {
    id: string;
    company_id: string;
    attendance_id: string;
    requested_check_in: string | null;
    requested_check_out: string | null;
    reason: string;
    rejection_reason: string | null;
    status: string;
    reviewed_by: string | null;
    reviewed_at: string | null;
    created_at: string | null;
  };
};

export type TeamAttendanceRow = {
  employee_id: string;
  employee_name?: string | null;
  department_id?: string | null;
  attendance_date: string;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes?: number | null;
};

export type TeamAttendanceResponse = {
  date: string;
  rows: TeamAttendanceRow[];
};

export type ShiftSwapRequest = {
  id: string;
  employee_id: string;
  employee_name: string | null;
  attendance_date: string;
  old_shift_template_id: string;
  old_shift_name: string | null;
  requested_shift_template_id: string;
  requested_shift_name: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type ShiftSwapRequestsResponse = {
  scope: "mine" | "review";
  rows: ShiftSwapRequest[];
};

export type ShiftSwapCreateResponse = {
  requestId: string;
};

export type ShiftSwapReviewResponse = {
  requestId: string;
  status: "approved" | "rejected";
};
