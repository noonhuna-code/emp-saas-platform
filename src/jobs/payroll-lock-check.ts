// Migration: Edge Function
// Purpose: Enforce payroll lock
// CRON: 0 2 2 * *

import { createSupabaseClient } from "../lib/supabase";

export default async function handler(): Promise<void> {
  const supabase = createSupabaseClient();

  const attempts: Array<{ fn: string; args?: Record<string, unknown> }> = [
    { fn: "run_payroll_auto_lock_scheduler" },
    { fn: "refresh_payroll_lock_state" }
  ];

  for (const attempt of attempts) {
    const { error } = await supabase.rpc(attempt.fn, attempt.args ?? {});
    if (!error) {
      return;
    }
  }

  console.warn("payroll-lock-check: no supported payroll lock RPC found");
}
