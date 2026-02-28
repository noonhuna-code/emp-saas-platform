import { applyLeave } from "../services/leave.service";
import { createMockContext } from "./shared";

export const leaveServiceSmoke = async (): Promise<void> => {
  const ctx = createMockContext({
    user_profiles: { data: { id: "00000000-0000-0000-0000-000000000020" }, error: null },
    leave_balances: { data: null, error: null }
  });

  const result = await applyLeave(ctx, "00000000-0000-0000-0000-000000000011", {
    leave_type_id: "00000000-0000-0000-0000-000000000012",
    start_date: "2026-02-01",
    end_date: "2026-02-01"
  });

  if (!result.ok && result.error === "Leave balance not found") {
    return;
  }

  throw new Error("leave.service smoke failed");
};

