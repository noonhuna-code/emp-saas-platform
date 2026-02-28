"use client";

import { useEffect, useMemo, useState } from "react";
import { createAttendanceCorrectionRequest } from "@/lib/client/api";
import type { AttendanceHistoryRow } from "@/lib/types/attendance";

const toDateTimeLocalValue = (value: string | null | undefined): string => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const localInputToIso = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export const CorrectionRequestDialog = ({
  open,
  record,
  onClose,
  onSubmitted
}: {
  open: boolean;
  record: AttendanceHistoryRow | null;
  onClose: () => void;
  onSubmitted?: () => void;
}) => {
  const [requestedCheckIn, setRequestedCheckIn] = useState("");
  const [requestedCheckOut, setRequestedCheckOut] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !record) return;
    setRequestedCheckIn(toDateTimeLocalValue(record.check_in));
    setRequestedCheckOut(toDateTimeLocalValue(record.check_out));
    setReason("");
    setNote("");
    setError(null);
    setSuccess(null);
  }, [open, record]);

  const canSubmit = useMemo(() => {
    return Boolean(record?.id) && reason.trim().length > 0 && !submitting;
  }, [record?.id, reason, submitting]);

  if (!open || !record) {
    return null;
  }

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await createAttendanceCorrectionRequest({
        attendanceId: record.id,
        requestedCheckIn: localInputToIso(requestedCheckIn),
        requestedCheckOut: localInputToIso(requestedCheckOut),
        reason: reason.trim(),
        note: note.trim() || null
      });

      if (!result.ok) {
        if (result.error === "Authentication required") {
          window.location.href = "/login";
          return;
        }
        if (result.error === "Permission denied") {
          window.location.href = "/403";
          return;
        }
        setError(result.error ?? "Unable to submit correction request");
        return;
      }

      setSuccess("Correction request submitted.");
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit correction request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,14,25,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50
      }}
    >
      <div className="card stack" style={{ width: "min(680px, 100%)", maxHeight: "90vh", overflow: "auto" }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0 }}>Request Attendance Correction</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Attendance date: {record.attendance_date}
            </p>
          </div>
          <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12
          }}
        >
          <div className="card" style={{ padding: 12 }}>
            <div className="muted">Original Clock In</div>
            <div>{record.check_in ? new Date(record.check_in).toLocaleString() : "—"}</div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="muted">Original Clock Out</div>
            <div>{record.check_out ? new Date(record.check_out).toLocaleString() : "—"}</div>
          </div>
        </div>

        <div className="form-grid">
          <label>
            Requested Clock In
            <input
              type="datetime-local"
              value={requestedCheckIn}
              onChange={(e) => setRequestedCheckIn(e.target.value)}
            />
          </label>
          <label>
            Requested Clock Out
            <input
              type="datetime-local"
              value={requestedCheckOut}
              onChange={(e) => setRequestedCheckOut(e.target.value)}
            />
          </label>
          <label>
            Reason
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain what needs correction"
              required
            />
          </label>
          <label>
            Optional Note
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
            />
          </label>
        </div>

        {error ? <p className="error" style={{ margin: 0 }}>{error}</p> : null}
        {success ? <p className="muted" style={{ margin: 0 }}>{success}</p> : null}

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="secondary-btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="primary-btn" onClick={submit} disabled={!canSubmit}>
            {submitting ? "Submitting..." : "Submit Correction Request"}
          </button>
        </div>
      </div>
    </div>
  );
};

