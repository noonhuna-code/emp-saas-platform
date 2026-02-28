import { headers } from "next/headers";

export const getRequestId = (): string => {
  const headerStore = headers() as unknown as { get?: (key: string) => string | null };
  const existing = headerStore?.get?.("x-request-id");
  if (existing) return existing;
  return crypto.randomUUID();
};
