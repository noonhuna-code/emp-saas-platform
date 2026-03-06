export type LeaveBalance = {
  id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  remaining_days: number;
  leave_type_name?: string | null;
  leave_type_is_paid?: boolean | null;
};

export type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason?: string | null;
  is_half_day: boolean;
  half_day_type?: string | null;
  approval_level?: number | null;
  final_approved?: boolean | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  employee_name?: string | null;
  employee_avatar_url?: string | null;
  department_id?: string | null;
  leave_type_name?: string | null;
};

export type LeaveTypeOption = {
  id: string;
  name: string;
  description?: string | null;
  is_paid: boolean;
  gender_restriction?: string | null;
};

export type LeaveBalancesResponse = { balances: LeaveBalance[] };
export type LeaveHistoryResponse = { requests: LeaveRequest[] };
export type LeaveReviewResponse = { requests: LeaveRequest[] };
export type LeaveCalendarResponse = { requests: LeaveRequest[] };
export type LeaveTypesResponse = { leaveTypes: LeaveTypeOption[] };

export type LeaveApplyInput = {
  employeeId: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  is_half_day?: boolean;
  half_day_type?: "first_half" | "second_half";
};

export type LeaveApplyResponse = { requestId: string };
export type LeaveDecisionResponse = { status: string };
export type LeaveCancelResponse = { status: string };


