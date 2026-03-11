import { useState } from "react";
import type { SupervisorFeedbackInput } from "@/lib/types/intelligence";

export const SupervisorFeedbackForm = ({
  onSubmit,
  loading
}: {
  onSubmit: (payload: SupervisorFeedbackInput) => Promise<void>;
  loading?: boolean;
}) => {
  const [payload, setPayload] = useState<SupervisorFeedbackInput>({
    employeeId: "",
    category: "neutral",
    feedbackText: "",
    feedbackDate: ""
  });

  const handleChange = (field: keyof SupervisorFeedbackInput, value: string) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(payload);
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Submit Feedback</h3>
      <div className="grid-two">
        <label>
          Employee ID
          <input
            value={payload.employeeId}
            onChange={(event) => handleChange("employeeId", event.target.value)}
            required
          />
        </label>
        <label>
          Category
          <select
            value={payload.category}
            onChange={(event) => handleChange("category", event.target.value as SupervisorFeedbackInput["category"])}
          >
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="warning">Warning</option>
          </select>
        </label>
        <label>
          Feedback Date
          <input
            type="date"
            value={payload.feedbackDate ?? ""}
            onChange={(event) => handleChange("feedbackDate", event.target.value)}
          />
        </label>
      </div>
      <label>
        Feedback
        <textarea
          value={payload.feedbackText}
          onChange={(event) => handleChange("feedbackText", event.target.value)}
          required
        />
      </label>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>
    </form>
  );
};
