import { getPayrollSummary } from "../services/reporting.service";
import { createMockContext } from "./shared";

export const reportingServiceSmoke = async (): Promise<void> => {
  const ctx = createMockContext({
    payroll_runs: { data: null, error: null }
  });

  const result = await getPayrollSummary(ctx, ctx.companyId, 2026, 2);

  if (result.ok && result.data?.totalGross === 0 && result.data?.totalNet === 0) {
    return;
  }

  throw new Error("reporting.service smoke failed");
};

