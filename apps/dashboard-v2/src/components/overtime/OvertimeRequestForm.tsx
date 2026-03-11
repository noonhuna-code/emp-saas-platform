"use client";

import { useState } from "react";
import type { OvertimeRequestInput } from "@/lib/types/overtime";

export const OvertimeRequestForm = ({
  onSubmit
}: {
  onSubmit: (payload: OvertimeRequestInput) => Promise<void>;
}) => {
  const [form, setForm] = useState<OvertimeRequestInput>({
    requestDate: "",
    requestedMinutes: 0,
    reason: ""
  });

  const handleSubmit = async () => {
    if (!form.requestDate || !form.reason || form.requestedMinutes <= 0) return;
    await onSubmit(form);
    setForm({ requestDate: "", requestedMinutes: 0, reason: "" });
  };

  return (
    <section className="card stack">
      <div>
        <h3>Request overtime</h3>
        <p className="muted">Submit a new overtime request for manager approval. Notifications are sent automatically.</p>
      </div>
      <div className="form-grid form-grid--two">
        <label>
          Request date
          <input
            type="date"
            value={form.requestDate}
            onChange={(event) => setForm((prev) => ({ ...prev, requestDate: event.target.value }))}
          />
        </label>
        <label>
          Requested minutes
          <input
            type="number"
            min={1}
            value={form.requestedMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, requestedMinutes: Number(event.target.value) }))}
          />
        </label>
        <label style={{ gridColumn: "1 / -1" }}>
          Reason
          <textarea
            value={form.reason}
            onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
            rows={3}
          />
        </label>
      </div>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="primary-btn" type="button" onClick={handleSubmit}>Submit request</button>
      </div>
    </section>
  );
};
