export type UnifiedApprovalItem = {
  type: "leave" | "attendance";
  id: string;
  employee_id: string;
  employee_name?: string | null;
  submitted_at: string;
  status: string;
  summary: string;
  source: "leave" | "attendance";
};

export type ApprovalsResponse = { items: UnifiedApprovalItem[] };