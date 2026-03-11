import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const getEnv = (key: string): string => process.env[key] ?? "";

export const createUserScopedSupabaseServerClient = (accessToken?: string): SupabaseClient => {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL") || getEnv("SUPABASE_URL");
  const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || getEnv("SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(url, anonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    }
  });
};
