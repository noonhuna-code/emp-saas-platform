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

export const clearDashboardCache = (prefix?: string): void => {
  if (!prefix) {
    CACHE.clear();
    return;
  }

  for (const key of CACHE.keys()) {
    if (key.includes(prefix)) {
      CACHE.delete(key);
    }
  }
};
