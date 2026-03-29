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

export type AttendanceDayState =
  | "go_active"
  | "go_applied"
  | "leave_unpaid"
  | "leave_paid"
  | "absent"
  | "off_day"
  | "present"
  | "on_break"
  | "clocked_out"
  | "late";

export type AttendancePayrollImpact =
  | "extra_pay_go_active"
  | "extra_pay_go_applied"
  | "no_pay_unpaid_leave"
  | "no_pay_absent"
  | "paid_leave"
  | "off_day_no_deduction"
  | "normal_pay";

export type AttendanceShiftContext = {
  status: "assigned" | "unassigned" | "off_day";
  assignment_id: string | null;
  shift_template_id: string | null;
  shift_name: string | null;
  start_time: string | null;
  end_time: string | null;
  effective_from: string | null;
  effective_to: string | null;
};

export type AttendanceLeaveContext = {
  request_id: string;
  leave_type_id: string | null;
  leave_type_name: string | null;
  is_paid: boolean;
  start_date: string;
  end_date: string;
  status: string;
};

export type AttendanceHolidayContext = {
  holiday_id: string;
  holiday_name: string;
  holiday_date: string;
  go_state: "go_active" | "go_applied" | null;
};

export type AttendanceLateLoginRequest = {
  exists: boolean;
  status: "pending" | "approved" | "rejected" | null;
  requestId: string | null;
};

export type AttendanceTodayResponse = {
  employeeId: string;
  todayDate: string;
  dayState: AttendanceDayState;
  payrollImpact: AttendancePayrollImpact;
  currentStatus: "not_clocked_in" | "clocked_in" | "on_break" | "clocked_out";
  isOnBreak: boolean;
  shiftContext: AttendanceShiftContext;
  leaveContext: AttendanceLeaveContext | null;
  holidayContext: AttendanceHolidayContext | null;
  lateLoginRequest: AttendanceLateLoginRequest;
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
  department_name?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  attendance_date: string;
  status: string | null;
  day_state: AttendanceDayState;
  payroll_impact: AttendancePayrollImpact;
  leave_type_name: string | null;
  holiday_name: string | null;
  shift_name: string | null;
  check_in: string | null;
  check_out: string | null;
  work_minutes: number | null;
  overtime_minutes: number | null;
  late_minutes?: number | null;
  late_login_request: AttendanceLateLoginRequest;
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
