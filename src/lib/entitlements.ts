import type { AuthContext } from "./types";

type EntitlementCache = {
  features: Map<string, boolean>;
  limits: Map<string, number | null>;
};

const cacheByContext = new WeakMap<AuthContext, EntitlementCache>();

const getCache = (ctx: AuthContext): EntitlementCache => {
  const existing = cacheByContext.get(ctx);
  if (existing) return existing;
  const created: EntitlementCache = {
    features: new Map<string, boolean>(),
    limits: new Map<string, number | null>()
  };
  cacheByContext.set(ctx, created);
  return created;
};

const sanitizeEntitlementError = (message?: string): string => {
  if (!message) return "Entitlement check failed";
  if (message === "UNAUTHENTICATED" || message.toLowerCase().includes("jwt")) {
    return "Authentication required";
  }
  if (message === "TENANT_MISMATCH") {
    return "Permission denied";
  }
  return "Entitlement check failed";
};

export const hasPlanFeature = async (
  ctx: AuthContext,
  featureKey: string
): Promise<boolean> => {
  const normalized = featureKey.trim();
  if (!normalized) return false;

  const cache = getCache(ctx);
  if (cache.features.has(normalized)) {
    return cache.features.get(normalized) ?? false;
  }

  const { data, error } = await ctx.supabase.rpc("has_feature", {
    p_company_id: ctx.companyId,
    p_feature_key: normalized
  });

  if (error) {
    throw new Error(sanitizeEntitlementError(error.message));
  }

  const enabled = Boolean(data);
  cache.features.set(normalized, enabled);
  return enabled;
};

export const requirePlanFeature = async (
  ctx: AuthContext,
  featureKey: string,
  errorMessage = "Feature disabled by current plan"
): Promise<void> => {
  const enabled = await hasPlanFeature(ctx, featureKey);
  if (!enabled) {
    throw new Error(errorMessage);
  }
};

export const requireAnyPlanFeature = async (
  ctx: AuthContext,
  featureKeys: string[],
  errorMessage = "Feature disabled by current plan"
): Promise<void> => {
  const keys = Array.from(new Set(featureKeys.map((value) => value.trim()).filter(Boolean)));
  if (keys.length === 0) {
    throw new Error(errorMessage);
  }
  for (const key of keys) {
    if (await hasPlanFeature(ctx, key)) {
      return;
    }
  }
  throw new Error(errorMessage);
};

export const getPlanLimit = async (
  ctx: AuthContext,
  limitKey: string
): Promise<number | null> => {
  const normalized = limitKey.trim();
  if (!normalized) return null;

  const cache = getCache(ctx);
  if (cache.limits.has(normalized)) {
    return cache.limits.get(normalized) ?? null;
  }

  const { data, error } = await ctx.supabase.rpc("get_feature_limit", {
    p_company_id: ctx.companyId,
    p_limit_key: normalized
  });

  if (error) {
    throw new Error(sanitizeEntitlementError(error.message));
  }

  const value = typeof data === "number" && Number.isFinite(data) ? Math.max(0, Math.floor(data)) : null;
  cache.limits.set(normalized, value);
  return value;
};
