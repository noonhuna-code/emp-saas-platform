import { useMemo, useState } from "react";
import type { LeaveApplyInput, LeaveBalance } from "@/lib/types/leave";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const LeaveApplyForm = ({
  onSubmit,
  loading,
  employeeId,
  balances
}: {
  onSubmit: (payload: LeaveApplyInput) => Promise<void>;
  loading?: boolean;
  employeeId?: string | null;
  balances: LeaveBalance[];
}) => {
  const [payload, setPayload] = useState<LeaveApplyInput>({
    employeeId: employeeId ?? "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    is_half_day: false,
    half_day_type: undefined
  });

  const leaveTypes = useMemo(() => {
    const map = new Map<string, string>();
    balances.forEach((balance) => {
      if (balance.leave_type_id) {
        map.set(balance.leave_type_id, balance.leave_type_name ?? "Leave");
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [balances]);

  const handleChange = (field: keyof LeaveApplyInput, value: string | boolean) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit({ ...payload, employeeId: employeeId ?? "" });
  };

  const hasTypes = leaveTypes.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Apply for Leave</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasTypes ? (
          <p className="text-sm text-muted-foreground">
            No leave types configured yet. Ask HR to publish leave types (AL, CL, SL, Unpaid, Maternity, etc.).
          </p>
        ) : null}
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm">
              Leave Type
              <select
                value={payload.leave_type_id}
                onChange={(event) => handleChange("leave_type_id", event.target.value)}
                required
              >
                <option value="">Select leave type</option>
                {leaveTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              Start Date
              <input
                type="date"
                value={payload.start_date}
                onChange={(event) => handleChange("start_date", event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              End Date
              <input
                type="date"
                value={payload.end_date}
                onChange={(event) => handleChange("end_date", event.target.value)}
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              Reason
              <input value={payload.reason ?? ""} onChange={(event) => handleChange("reason", event.target.value)} />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={payload.is_half_day ?? false}
              onChange={(event) => handleChange("is_half_day", event.target.checked)}
            />
            Half day
          </label>

          {payload.is_half_day ? (
            <label className="grid gap-1.5 text-sm">
              Half day type
              <select
                value={payload.half_day_type ?? ""}
                onChange={(event) => handleChange("half_day_type", event.target.value as "first_half" | "second_half")}
                required
              >
                <option value="">Select</option>
                <option value="first_half">First half</option>
                <option value="second_half">Second half</option>
              </select>
            </label>
          ) : null}

          <div className="flex justify-end">
            <button className="primary-btn" type="submit" disabled={loading || !hasTypes || !employeeId}>
              {loading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
