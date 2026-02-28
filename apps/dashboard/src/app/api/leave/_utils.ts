import type { ServiceContext } from "@emp/lib/types";
import { buildServiceContext } from "@/lib/server/service-context";
import { requireServerPermission } from "@/lib/server/permissions";
import { resolveCurrentEmployeeId } from "@/lib/server/employee-context";
import { jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";

export const buildLeaveRouteContext = async (ctxOverride?: ServiceContext) => {
  const ctx = ctxOverride ?? (await buildServiceContext());
  return { ctx };
};

export const requireLeaveManager = (ctx: ServiceContext) => {
  requireServerPermission("manage_employees", ctx);
};

export const resolveTargetEmployeeId = async (
  ctx: ServiceContext,
  requestedEmployeeId?: string | null
): Promise<string | null> => {
  if (requestedEmployeeId && ctx.permissions.includes("manage_employees")) {
    return requestedEmployeeId;
  }

  const selfId = await resolveCurrentEmployeeId(ctx);
  return selfId ?? null;
};

export const jsonServiceError = (error: string | undefined, fallback: string, requestId?: string) => {
  return jsonError(sanitizeServiceError(error, fallback), mapServiceErrorStatus(error), requestId);
};
