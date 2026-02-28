import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const readEnv = (key: string): string => {
  const denoValue =
    typeof globalThis !== "undefined" &&
    "Deno" in globalThis &&
    (globalThis as { Deno?: { env?: { get?: (k: string) => string | undefined } } }).Deno?.env?.get
      ? (globalThis as unknown as { Deno: { env: { get: (k: string) => string | undefined } } }).Deno.env.get(key)
      : undefined;

  if (denoValue) {
    return denoValue;
  }

  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }

  return "";
};

export const createSupabaseClient = (accessToken?: string): SupabaseClient => {
  const url = readEnv("SUPABASE_URL");
  const anonKey = readEnv("SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY");
  }

  return createClient(url, anonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    }
  });
};
