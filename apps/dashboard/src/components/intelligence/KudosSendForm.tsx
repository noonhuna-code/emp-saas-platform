import { useState } from "react";
import type { KudosInput } from "@/lib/types/intelligence";

export const KudosSendForm = ({
  onSubmit,
  loading
}: {
  onSubmit: (payload: KudosInput) => Promise<void>;
  loading?: boolean;
}) => {
  const [payload, setPayload] = useState<KudosInput>({
    receiverEmployeeId: "",
    points: 5,
    message: ""
  });

  const handleChange = (field: keyof KudosInput, value: string | number) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(payload);
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Send Kudos</h3>
      <div className="grid-two">
        <label>
          Receiver Employee ID
          <input
            value={payload.receiverEmployeeId}
            onChange={(event) => handleChange("receiverEmployeeId", event.target.value)}
            required
          />
        </label>
        <label>
          Points (1-50)
          <input
            type="number"
            min={1}
            max={50}
            value={payload.points}
            onChange={(event) => handleChange("points", Number(event.target.value))}
          />
        </label>
      </div>
      <label>
        Message
        <textarea value={payload.message ?? ""} onChange={(event) => handleChange("message", event.target.value)} />
      </label>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </form>
  );
};
