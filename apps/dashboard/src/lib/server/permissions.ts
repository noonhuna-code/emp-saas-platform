import type { AuthContext } from "@emp/lib/types";
import { requirePermission } from "@emp/lib/auth-wrapper";
import { buildAuthContext } from "./auth";

export const requireServerPermission = (permission: string, ctx: AuthContext): void => {
  requirePermission(permission, ctx);
};

export const withRoutePermission =
  (permission: string, handler: (ctx: AuthContext, request: Request) => Promise<Response>) =>
  async (request: Request): Promise<Response> => {
    const ctx = await buildAuthContext();
    requireServerPermission(permission, ctx);
    return handler(ctx, request);
  };
