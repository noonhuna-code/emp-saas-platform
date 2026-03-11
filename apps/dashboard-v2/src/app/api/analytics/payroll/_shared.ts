export const PAYROLL_ANALYTICS_MONTH_OPTIONS = [3, 6, 12, 24] as const;

export const parsePayrollAnalyticsMonths = (
  request: Request
): { ok: true; months?: number } | { ok: false; error: string } => {
  const url = new URL(request.url);
  const raw = url.searchParams.get("months");
  if (raw === null || raw.trim() === "") {
    return { ok: true };
  }

  const value = Number(raw);
  if (!Number.isFinite(value) || !Number.isInteger(value)) {
    return { ok: false, error: "Invalid months parameter" };
  }

  if (!(PAYROLL_ANALYTICS_MONTH_OPTIONS as readonly number[]).includes(value)) {
    return { ok: false, error: "Invalid months parameter" };
  }

  return { ok: true, months: value };
};

