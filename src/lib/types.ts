import type { SupabaseClient } from "@supabase/supabase-js";

export type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type AuthContext = {
  supabase: SupabaseClient;
  userId: string;
  userProfileId: string;
  companyId: string;
  role: string;
  permissions: string[];
  logger: Logger;
};

export type ServiceResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type TransactionRunner = <T>(fn: (client: SupabaseClient) => Promise<T>) => Promise<T>;

export type ServiceContext = AuthContext & {
  requestId: string;
  runInTransaction?: TransactionRunner;
};
