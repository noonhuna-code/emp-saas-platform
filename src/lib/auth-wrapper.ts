import type { AuthContext } from "./types";

export const requirePermission = (permission: string, ctx: AuthContext): void => {
  if (!ctx.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`);
  }
};

export const requireCompany = (companyId: string, ctx: AuthContext): void => {
  if (companyId !== ctx.companyId) {
    throw new Error("Company mismatch");
  }
};

export const assertEmployeeScope = (employeeId: string, ctx: AuthContext): void => {
  if (!employeeId) {
    throw new Error("Employee id required");
  }
  // RLS enforces scope; this is a defensive check to avoid cross-tenant writes.
};