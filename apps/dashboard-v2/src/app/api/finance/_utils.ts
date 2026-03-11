export const parsePositiveInt = (value: string | null | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

export const parseNonNegativeInt = (value: string | null | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};

export const parseStatusList = (searchParams: URLSearchParams): string[] | undefined => {
  const repeated = searchParams.getAll("status").flatMap((s) => s.split(","));
  const normalized = repeated.map((s) => s.trim()).filter(Boolean);
  return normalized.length ? normalized : undefined;
};

export const parseIsoDate = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
};

export const parseObligationType = (
  value: string | null | undefined
): "advance" | "loan" | undefined => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "advance" || normalized === "loan") return normalized;
  return undefined;
};
