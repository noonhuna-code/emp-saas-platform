import { useState } from "react";

export const ConfirmDialog = ({
  title,
  confirmLabel,
  cancelLabel = "Cancel",
  requireReason = false,
  onConfirm,
  onCancel,
  open,
  busy
}: {
  title: string;
  confirmLabel: string;
  cancelLabel?: string;
  requireReason?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
  open: boolean;
  busy?: boolean;
}) => {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>{title}</h3>
        {requireReason ? (
          <div className="stack">
            <label>
              Reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Provide a reason"
              />
            </label>
          </div>
        ) : null}
        <div className="row" style={{ justifyContent: "flex-end", gap: "12px", marginTop: "16px" }}>
          <button className="secondary-btn" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className="primary-btn"
            onClick={() => onConfirm(requireReason ? reason : undefined)}
            disabled={busy || (requireReason && reason.trim().length === 0)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};