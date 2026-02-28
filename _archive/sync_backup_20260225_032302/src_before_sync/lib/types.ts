import type { SupabaseClient } from '@supabase/supabase-js';

export type Database = any;

export type Logger = {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug?: (message: string, meta?: Record<string, unknown>) => void;
};

export type TransactionRunner = <T>(
  work: (tx: SupabaseClient<Database>) => Promise<T>
) => Promise<T>;

export type AuthContext = {
  accessToken: string;
  userId: string;
  companyId: string;
  permissions: string[];
  role?: string;
  requestId?: string;
  logger?: Logger;
  supabase: SupabaseClient<Database>;
  runInTransaction?: TransactionRunner;
};

export type ServiceResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export type ClockInPayload = {
  occurredAt?: string;
  geo?: { lat: number; lng: number } | null;
  ipAddress?: string | null;
  source?: 'web' | 'mobile' | 'device';
};

export type ClockInResult = {
  attendanceId: string;
  attendanceDate: string;
  status: string;
  checkIn: string;
};

export type ClockOutResult = {
  attendanceId: string;
  checkOut: string;
  status?: string;
  workMinutes?: number | null;
  overtimeMinutes?: number | null;
};

export type AttendanceCorrectionPayload = {
  reason: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
};

export type LeaveApplyPayload = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  isHalfDay?: boolean;
  halfDayType?: 'first_half' | 'second_half' | null;
};

export type PayrollRunRequest = {
  year: number;
  month: number;
};

export type PayrollRunSummary = {
  payrollMonthId: string;
  processedEmployees: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  locked: boolean;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type CronJobContext = {
  accessToken: string;
  companyId: string;
  logger?: Logger;
  requestId?: string;
};

export const defaultLogger: Logger = {
  info: (message, meta) => console.log('[INFO]', message, meta ?? {}),
  warn: (message, meta) => console.warn('[WARN]', message, meta ?? {}),
  error: (message, meta) => console.error('[ERROR]', message, meta ?? {}),
  debug: (message, meta) => console.debug('[DEBUG]', message, meta ?? {}),
};