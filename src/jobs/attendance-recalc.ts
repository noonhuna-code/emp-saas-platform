// Migration: Edge Function
// Purpose: Daily attendance reconciliation
// CRON: 59 23 * * *

import { createSupabaseClient } from "../lib/supabase";

export default async function handler(): Promise<void> {
  const supabase = createSupabaseClient();

  const attempts: Array<{ fn: string; args?: Record<string, unknown> }> = [
    { fn: "run_nightly_attendance_reconciliation" },
    { fn: "auto_mark_absent" }
  ];

  for (const attempt of attempts) {
    const { error } = await supabase.rpc(attempt.fn, attempt.args ?? {});
    if (!error) {
      return;
    }
  }

  console.warn("attendance-recalc: no supported attendance reconciliation RPC found");
}
