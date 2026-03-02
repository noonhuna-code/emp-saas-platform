export type WorkspaceResource = {
  id: string;
  title: string;
  resource_type: string;
  summary: string | null;
  link_url: string | null;
  file_url: string | null;
  created_at: string;
};

export type WorkspaceResourceListResponse = {
  rows: WorkspaceResource[];
};

export type WorkspaceNote = {
  id: string;
  title: string;
  body: string;
  file_url: string | null;
  file_name: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkspaceNotesResponse = {
  employeeId: string;
  rows: WorkspaceNote[];
};

export type WorkspaceCreateNoteResponse = {
  id: string;
};

export type WorkspaceChatMessage = {
  id: string;
  sender_employee_id: string;
  recipient_employee_id: string;
  sender_name: string | null;
  recipient_name: string | null;
  message_text: string;
  created_at: string;
  direction: "in" | "out";
};

export type WorkspaceChatResponse = {
  employeeId: string;
  rows: WorkspaceChatMessage[];
};

export type WorkspaceSendChatResponse = {
  id: string;
};

export type WorkspaceContact = {
  employee_id: string;
  full_name: string | null;
  employee_code: string | null;
  designation: string | null;
  department_name: string | null;
  team_name: string | null;
  avatar_url: string | null;
  is_team_lead: boolean;
  is_self: boolean;
};

export type WorkspaceContactsResponse = {
  employeeId: string;
  rows: WorkspaceContact[];
};

export type WorkspaceNotification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export type WorkspaceNotificationsResponse = {
  rows: WorkspaceNotification[];
};

export type WorkspaceMarkNotificationsReadResponse = {
  updated: number;
};

export type ShiftTemplate = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  timezone: string | null;
  is_night_shift: boolean;
};

export type ShiftTemplatesResponse = {
  rows: ShiftTemplate[];
};

export type ShiftAssignment = {
  id: string;
  employee_id: string;
  shift_template_id: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
};

export type ShiftAssignmentsResponse = {
  employeeId: string;
  rows: ShiftAssignment[];
};

export type ShiftAssignableEmployee = {
  id: string;
  full_name: string | null;
  employee_code: string | null;
  designation: string | null;
  department_name: string | null;
  team_name: string | null;
  is_direct_report: boolean;
};

export type ShiftAssignableEmployeesResponse = {
  rows: ShiftAssignableEmployee[];
};

export type AssignShiftResponse = {
  assignmentId: string;
};
