import type { AuthContext } from "./types";

export type FinancialObligationCapability =
  | "request_salary_advance"
  | "request_loan"
  | "view_own_obligations"
  | "review_salary_advance"
  | "review_loan_requests"
  | "manage_obligation_creation";

/**
 * Financial Obligations Capability Matrix (Stage 2A)
 *
 * This helper centralizes capability derivation without role-string checks in
 * service methods. It maps current permission keys to Stage 2A capabilities.
 *
 * Employee (authenticated company user):
 * - request_salary_advance
 * - request_loan
 * - view_own_obligations
 *
 * HR / Finance compatibility mapping:
 * - manage_payroll OR manage_employees -> review_salary_advance, review_loan_requests, manage_obligation_creation
 *
 * Founder/Admin (read-only in Stage 2A):
 * - manage_company -> review_salary_advance, review_loan_requests
 *   (no manage_obligation_creation)
 */

const addMany = (target: Set<FinancialObligationCapability>, capabilities: FinancialObligationCapability[]) => {
  for (const capability of capabilities) target.add(capability);
};

export const resolveFinancialObligationCapabilities = (
  ctx: AuthContext
): Set<FinancialObligationCapability> => {
  const capabilities = new Set<FinancialObligationCapability>();

  // Base self-service capabilities for authenticated company users.
  addMany(capabilities, ["request_salary_advance", "request_loan", "view_own_obligations"]);

  if (ctx.permissions.includes("manage_payroll") || ctx.permissions.includes("manage_employees")) {
    addMany(capabilities, [
      "review_salary_advance",
      "review_loan_requests",
      "manage_obligation_creation"
    ]);
  }

  if (ctx.permissions.includes("manage_company")) {
    addMany(capabilities, ["review_salary_advance", "review_loan_requests"]);
  }

  return capabilities;
};

export const hasFinancialObligationCapability = (
  ctx: AuthContext,
  capability: FinancialObligationCapability
): boolean => {
  return resolveFinancialObligationCapabilities(ctx).has(capability);
};

export const requireFinancialObligationCapability = (
  ctx: AuthContext,
  capability: FinancialObligationCapability
): void => {
  if (!hasFinancialObligationCapability(ctx, capability)) {
    throw new Error("Permission denied");
  }
};

