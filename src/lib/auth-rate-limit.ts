import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type AuthRateLimitOptions = {
  windowSeconds?: number;
  maxAttempts?: number;
  lockMinutes?: number;
};

const hashValue = (value: string): string => {
  return createHash("sha256").update(value).digest("hex");
};

const readHeader = (headers: Headers, name: string): string | null => {
  const value = headers.get(name);
  if (!value) return null;
  return value.trim();
};

const extractClientIp = (request: Request): string | null => {
  const headers = request.headers;
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = readHeader(headers, "x-real-ip");
  if (realIp) return realIp;
  const cfIp = readHeader(headers, "cf-connecting-ip");
  if (cfIp) return cfIp;
  return null;
};

const invokeRateLimit = async (
  supabase: SupabaseClient,
  identifierType: "ip" | "email",
  identifierValue: string,
  options: AuthRateLimitOptions
): Promise<void> => {
  const { data, error } = await supabase.rpc("auth_rate_limit_check", {
    p_identifier_type: identifierType,
    p_identifier_hash: hashValue(identifierValue),
    p_window_seconds: options.windowSeconds ?? 60,
    p_max_attempts: options.maxAttempts ?? 5,
    p_lock_minutes: options.lockMinutes ?? 5
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("AUTH_RATE_LIMITED");
  }
};

export const enforceAuthRateLimit = async (
  supabase: SupabaseClient,
  request: Request,
  {
    email,
    includeEmail = false,
    includeIp = true,
    windowSeconds,
    maxAttempts,
    lockMinutes
  }: AuthRateLimitOptions & { email?: string; includeEmail?: boolean; includeIp?: boolean }
): Promise<void> => {
  const options: AuthRateLimitOptions = { windowSeconds, maxAttempts, lockMinutes };

  if (includeIp) {
    const ip = extractClientIp(request);
    if (ip) {
      await invokeRateLimit(supabase, "ip", ip, options);
    }
  }

  if (includeEmail && email) {
    await invokeRateLimit(supabase, "email", email.toLowerCase(), options);
  }
};
