// Migration: Edge Function
// Purpose: Escalate pending approvals
// CRON: */30 * * * *

import { createSupabaseClient } from "../lib/supabase";

export default async function handler(): Promise<void> {
  const supabase = createSupabaseClient();

  const { data: pending } = await supabase
    .from("leave_requests")
    .select("id, updated_at")
    .eq("status", "pending")
    .is("is_deleted", false)
    .limit(100);

  // TODO: Implement escalation routing via manager lookup + valid recipient_profile_id.
  // Current worker intentionally avoids invalid notification inserts (null company/recipient).
  console.info(`escalation-worker: scanned ${pending?.length ?? 0} pending leave requests`);
}
