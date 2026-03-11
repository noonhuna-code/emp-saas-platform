export type EmployeeDirectoryRow = {
  id: string;
  company_id: string;
  user_profile_id?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  employment_status?: string | null;
  job_level?: string | null;
  employee_code?: string | null;
  created_at?: string | null;
};

export type EmployeeListResponse = {
  rows: EmployeeDirectoryRow[];
  total: number;
};

export type EmployeeDetailResponse = {
  employee: Record<string, unknown>;
  profileCompletenessScore: number | null;
};
