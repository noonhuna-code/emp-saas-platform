export type ProjectSummaryRow = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "on_hold" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  owner_employee_id: string | null;
  owner_name: string | null;
  owner_employee_code: string | null;
  member_count: number;
  task_counts: {
    total: number;
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
  };
};

export type ProjectTaskSummaryRow = {
  id: string;
  project_id: string;
  project_name: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "blocked" | "done";
  due_date: string | null;
  created_at: string | null;
  assignee_employee_id: string | null;
  assignee_name: string | null;
  assignee_employee_code: string | null;
};

export type ProjectListResponse = {
  rows: ProjectSummaryRow[];
};

export type ProjectTaskListResponse = {
  rows: ProjectTaskSummaryRow[];
};
