export type EmployeeDashboardResponse = {
  attendanceToday: {
    status: string;
    checkIn?: string | null;
    checkOut?: string | null;
    workMinutes?: number | null;
    overtimeMinutes?: number | null;
    lateMinutes?: number | null;
    isOnBreak: boolean;
  } | null;
  leaveBalances: Array<{
    leave_type_id: string;
    year: number;
    entitled_days: number;
    used_days: number;
  }>;
  upcomingShifts: Array<{
    shift_name: string;
    start_time: string;
    end_time: string;
    timezone: string;
    effective_from: string;
    effective_to?: string | null;
  }>;
  recentPayslips: Array<{
    id: string;
    generated_at: string;
    net_salary: number | null;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message?: string | null;
    created_at: string;
    is_read: boolean;
  }>;
  securityStatus: {
    lastRiskScore: number | null;
    lastLoginAt: string | null;
  };
  profileCompletenessScore: number | null;
};

export type ManagerDashboardResponse = {
  teamAttendanceHeatmap: Array<{
    date: string;
    present: number;
    absent: number;
    onLeave: number;
  }>;
  pendingLeaveApprovals: number;
  pendingOvertimeApprovals: number;
  teamReliabilityScore: number | null;
  quickSearch: Array<{ id: string; full_name: string; designation?: string | null }>;
};

export type AdminDashboardResponse = {
  headcount: { total: number; active: number };
  attendanceRate: number | null;
  leaveUtilization: number | null;
  payrollSnapshot: { runId: string; status: string; totalNet: number } | null;
  securityAlerts: Array<{ id: string; lock_reason: string; created_at: string }>;
  departmentBreakdown: Array<{ department: string; count: number }>;
};
