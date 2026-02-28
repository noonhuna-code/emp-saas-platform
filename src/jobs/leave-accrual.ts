// Migration: Edge Function
// Purpose: Monthly leave accrual
// CRON: 0 0 1 * *

import { createSupabaseClient } from "../lib/supabase";

export default async function handler(): Promise<void> {
  const supabase = createSupabaseClient();

  const attempts: Array<{ fn: string; args?: Record<string, unknown> }> = [
    { fn: "run_leave_accrual_scheduler", args: { p_company_id: null, p_force: false } },
    { fn: "process_monthly_leave_accrual", args: { company_uuid: null } }
  ];

  for (const attempt of attempts) {
    const { error } = await supabase.rpc(attempt.fn, attempt.args ?? {});
    if (!error) {
      return;
    }
  }

  console.warn("leave-accrual: no supported leave accrual RPC found");
}
