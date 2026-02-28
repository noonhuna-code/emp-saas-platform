import { useState } from "react";
import type { LeaveApplyInput } from "@/lib/types/leave";

export const LeaveApplyForm = ({
  onSubmit,
  loading
}: {
  onSubmit: (payload: LeaveApplyInput) => Promise<void>;
  loading?: boolean;
}) => {
  const [payload, setPayload] = useState<LeaveApplyInput>({
    employeeId: "",
    leave_type_id: "",
    start_date: "",
    end_date: "",
    reason: "",
    is_half_day: false,
    half_day_type: undefined
  });

  const handleChange = (field: keyof LeaveApplyInput, value: string | boolean) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(payload);
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Apply for Leave</h3>
      <div className="grid-two">
        <label>
          Leave Type ID
          <input
            value={payload.leave_type_id}
            onChange={(event) => handleChange("leave_type_id", event.target.value)}
            required
          />
        </label>
        <label>
          Start Date
          <input
            type="date"
            value={payload.start_date}
            onChange={(event) => handleChange("start_date", event.target.value)}
            required
          />
        </label>
        <label>
          End Date
          <input
            type="date"
            value={payload.end_date}
            onChange={(event) => handleChange("end_date", event.target.value)}
            required
          />
        </label>
        <label>
          Reason
          <input value={payload.reason ?? ""} onChange={(event) => handleChange("reason", event.target.value)} />
        </label>
      </div>

      <label className="row" style={{ gap: "8px" }}>
        <input
          type="checkbox"
          checked={payload.is_half_day ?? false}
          onChange={(event) => handleChange("is_half_day", event.target.checked)}
        />
        Half day
      </label>

      {payload.is_half_day ? (
        <label>
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

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
};