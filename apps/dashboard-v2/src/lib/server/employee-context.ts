import type { ServiceContext } from "@emp/lib/types";

export const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  const { data: profile } = await ctx.supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  if (!profile?.id) return null;

  const { data: employee } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", profile.id)
    .is("is_deleted", false)
    .maybeSingle();

  return employee?.id ?? null;
};