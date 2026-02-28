export type DashboardSession = {
  userId: string | null;
  companyId: string | null;
  role: string | null;
  permissions: string[];
  email?: string | null;
};
