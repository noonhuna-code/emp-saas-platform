type CacheEntry<T> = {
  value: T;
  ts: number;
};

const CACHE = new Map<string, CacheEntry<unknown>>();

export const getCached = <T>(key: string, maxAgeMs: number): T | null => {
  const entry = CACHE.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.ts > maxAgeMs) return null;
  return entry.value;
};

export const setCached = <T>(key: string, value: T): void => {
  CACHE.set(key, { value, ts: Date.now() });
};
