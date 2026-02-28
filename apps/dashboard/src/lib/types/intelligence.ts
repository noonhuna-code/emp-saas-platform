export type ReliabilityRankingRow = {
  employee_id: string;
  department_id?: string | null;
  reliability_score: number;
  attendance_percentage: number;
  late_frequency_percentage: number;
  absence_frequency_percentage: number;
  leave_frequency_percentage: number;
  correction_frequency_percentage: number;
  company_rank: number;
  department_rank: number;
  employee_name?: string | null;
};

export type ReliabilityOverview = {
  company: Record<string, unknown> | null;
  departments: Array<Record<string, unknown>>;
  ranking: ReliabilityRankingRow[];
  window_start_date: string | null;
  window_end_date: string | null;
};

export type EmployeeReliabilityCard = {
  employee_id: string;
  reliability_score: number;
  company_rank: number;
  department_rank?: number | null;
  attendance_percentage: number;
  late_frequency_percentage: number;
  absence_frequency_percentage: number;
  leave_frequency_percentage: number;
  correction_frequency_percentage: number;
  window_start_date?: string | null;
  window_end_date?: string | null;
};

export type EmployeeReliabilityResponse = {
  card: EmployeeReliabilityCard | null;
};

export type SupervisorFeedbackItem = {
  id: string;
  employee_id: string;
  supervisor_employee_id: string;
  category: "positive" | "neutral" | "warning";
  feedback_text: string;
  feedback_date: string;
  created_at: string;
  employee_name?: string | null;
  employee_avatar_url?: string | null;
};

export type SupervisorFeedbackResponse = { feedback: SupervisorFeedbackItem[] };
export type SupervisorFeedbackInput = {
  employeeId: string;
  category: "positive" | "neutral" | "warning";
  feedbackText: string;
  feedbackDate?: string;
};

export type KudosItem = {
  id: string;
  sender_employee_id: string;
  receiver_employee_id: string;
  points: number;
  message?: string | null;
  month_bucket_utc: string;
  created_at: string;
  receiver_name?: string | null;
};

export type KudosHistoryResponse = { kudos: KudosItem[] };
export type KudosInput = {
  receiverEmployeeId: string;
  points: number;
  message?: string;
};

export type KudosLeaderboardResponse = {
  month_bucket_utc: string | null;
  employees: Array<Record<string, unknown>>;
  departments: Array<Record<string, unknown>>;
  company: Array<Record<string, unknown>>;
};
