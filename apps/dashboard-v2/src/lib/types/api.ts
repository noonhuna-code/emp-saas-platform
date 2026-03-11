export type DashboardApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};
