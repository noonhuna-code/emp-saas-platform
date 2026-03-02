export type DashboardSession = {
  userId: string | null;
  companyId: string | null;
  employeeId?: string | null;
  role: string | null;
  permissions: string[];
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  shiftStartTime?: string | null;
  shiftEndTime?: string | null;
  shiftHours?: number | null;
};
