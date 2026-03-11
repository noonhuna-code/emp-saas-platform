"use client";

import { useMemo, useState } from "react";

type PayrollRunFormPayload = {
  year: number;
  month: number;
};

const getCurrentPeriodValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parsePeriod = (value: string): PayrollRunFormPayload | null => {
  const [yearPart, monthPart] = value.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
};

export const PayrollRunForm = ({
  onSubmit
}: {
  onSubmit: (payload: PayrollRunFormPayload) => Promise<void>;
}) => {
  const [period, setPeriod] = useState<string>(getCurrentPeriodValue);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const parsedPeriod = useMemo(() => parsePeriod(period), [period]);

  const handleSubmit = async () => {
    if (!parsedPeriod || submitting) {
      if (!parsedPeriod) setLocalError("Select a valid payroll period.");
      return;
    }

    setSubmitting(true);
    setLocalError(null);
    try {
      await onSubmit(parsedPeriod);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Payroll run failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card stack">
      <div>
        <h3>Run payroll</h3>
        <p className="muted">
          Starts an atomic payroll run for the selected month. Duplicate submissions are idempotent and rate limited.
        </p>
      </div>

      <div className="form-grid form-grid--two">
        <label>
          Payroll period
          <input
            type="month"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            max="2099-12"
          />
        </label>
        <label>
          Action
          <div className="row" style={{ gap: 8 }}>
            <button className="primary-btn" type="button" onClick={handleSubmit} disabled={submitting || !parsedPeriod}>
              {submitting ? "Running..." : "Run payroll"}
            </button>
          </div>
        </label>
      </div>

      {localError ? <p className="error">{localError}</p> : null}
    </section>
  );
};
