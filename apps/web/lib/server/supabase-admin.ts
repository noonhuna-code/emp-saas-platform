import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const getEnv = (key: string): string => process.env[key]?.trim() ?? "";

export const createSupabaseAdminServerClient = (): SupabaseClient => {
  const url = getEnv("SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables for website inquiries");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
