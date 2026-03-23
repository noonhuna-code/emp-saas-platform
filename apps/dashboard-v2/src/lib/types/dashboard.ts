export type EmployeeDashboardResponse = {
  workspace: {
    employee: {
      id: string;
      employee_code: string | null;
      full_name: string | null;
      avatar_url: string | null;
      designation: string | null;
      department_name: string | null;
      team_name: string | null;
    };
    teamLead: {
      employee_id: string;
      full_name: string | null;
      email: string | null;
    } | null;
    department: {
      id: string;
      name: string;
      main_contact_label: string | null;
      main_contact_email: string | null;
      main_contact_phone: string | null;
    } | null;
    company: {
      id: string;
      name: string;
      slug: string;
    } | null;
    counts: {
      notes: number;
      files: number;
      resources: number;
      sops: number;
      unreadNotifications: number;
      activeLoans: number;
      openLoanRequests: number;
      chatMessages: number;
    };
    resources: Array<{
      id: string;
      title: string;
      resource_type: string;
      summary: string | null;
      link_url: string | null;
      file_url: string | null;
      created_at: string;
    }>;
    notes: Array<{
      id: string;
      title: string;
      body: string;
      file_url: string | null;
      file_name: string | null;
      is_pinned: boolean;
      updated_at: string;
    }>;
    chat: Array<{
      id: string;
      sender_employee_id: string;
      recipient_employee_id: string;
      sender_name: string | null;
      recipient_name: string | null;
      message_text: string;
      created_at: string;
      direction: "in" | "out";
    }>;
    loanRequests: Array<{
      id: string;
      obligation_type: string;
      status: string;
      requested_amount: number;
      currency_code: string;
      created_at: string;
    }>;
  };
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
