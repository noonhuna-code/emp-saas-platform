export const isFeatureEnabled = (
  entitlements: Record<string, unknown> | null | undefined,
  featureKey: string
): boolean => {
  if (!entitlements) return false;
  return entitlements[featureKey] === true;
};

export const getLimitInteger = (
  entitlements: Record<string, unknown> | null | undefined,
  limitKey: string
): number | null => {
  if (!entitlements) return null;
  const raw = entitlements[limitKey];
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.floor(parsed) : null;
  }
  return null;
};
