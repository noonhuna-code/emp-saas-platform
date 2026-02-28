// Migration: Edge Function
// Purpose: Notification dispatch worker

import { createSupabaseClient } from "../lib/supabase";

export default async function handler(): Promise<void> {
  const supabase = createSupabaseClient();

  const { data: pending, error } = await supabase
    .from("email_queue")
    .select("id, retry_count, company_id")
    .eq("status", "pending")
    .is("is_deleted", false)
    .limit(100);

  if (error) {
    console.warn("notification-worker: email_queue unavailable or query failed", error.message);
    return;
  }

  for (const row of pending ?? []) {
    // TODO: Replace stub with real provider dispatch (SendGrid/SES/etc.)
    const { error: updateError } = await supabase
      .from("email_queue")
      .update({
        status: "sent",
        updated_at: new Date().toISOString()
      })
      .eq("id", row.id)
      .eq("company_id", row.company_id)
      .eq("status", "pending")
      .is("is_deleted", false);

    if (updateError) {
      await supabase
        .from("email_queue")
        .update({
          status: "failed",
          retry_count: (row.retry_count ?? 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq("id", row.id)
        .eq("company_id", row.company_id)
        .is("is_deleted", false);
    }
  }
}
