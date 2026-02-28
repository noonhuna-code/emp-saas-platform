import { clockOut } from "../services/attendance.service";
import { createMockContext } from "./shared";

export const attendanceServiceSmoke = async (): Promise<void> => {
  const ctx = createMockContext({
    attendance_records: { data: null, error: null }
  });

  const result = await clockOut(ctx, "00000000-0000-0000-0000-000000000010");

  if (!result.ok && result.error === "No open attendance record") {
    return;
  }

  throw new Error("attendance.service smoke failed");
};

