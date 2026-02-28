"use client";

import { useActionState, useEffect } from "react";

export type ClockActionState = {
  ok: boolean;
  error?: string;
  attendanceId?: string;
  completedAt?: number;
};

type ClockServerAction = (
  prevState: ClockActionState,
  formData: FormData
) => Promise<ClockActionState>;

const INITIAL_STATE: ClockActionState = { ok: false };

export const ClockActions = ({
  employeeId,
  locked,
  canClockIn,
  canClockOut,
  clockInAction,
  clockOutAction,
  onCompleted
}: {
  employeeId: string;
  locked: boolean;
  canClockIn: boolean;
  canClockOut: boolean;
  clockInAction: ClockServerAction;
  clockOutAction: ClockServerAction;
  onCompleted?: () => void;
}) => {
  const [clockInState, clockInFormAction, clockInPending] = useActionState(clockInAction, INITIAL_STATE);
  const [clockOutState, clockOutFormAction, clockOutPending] = useActionState(clockOutAction, INITIAL_STATE);

  useEffect(() => {
    if (clockInState.ok && clockInState.completedAt) {
      onCompleted?.();
    }
  }, [clockInState, onCompleted]);

  useEffect(() => {
    if (clockOutState.ok && clockOutState.completedAt) {
      onCompleted?.();
    }
  }, [clockOutState, onCompleted]);

  const disabledAll = locked || clockInPending || clockOutPending || !employeeId;
  const latestError = clockOutState.error || clockInState.error || null;

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>Clock Actions</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Attendance mutations are executed via server actions and the backend attendance service.
          </p>
        </div>
        {locked ? <span className="badge">Attendance locked</span> : null}
      </div>

      <div className="row" style={{ flexWrap: "wrap" }}>
        <form action={clockInFormAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="source" value="web" />
          <button className="primary-btn" type="submit" disabled={disabledAll || !canClockIn}>
            {clockInPending ? "Clocking In..." : "Clock In"}
          </button>
        </form>

        <form action={clockOutFormAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <button className="secondary-btn" type="submit" disabled={disabledAll || !canClockOut}>
            {clockOutPending ? "Clocking Out..." : "Clock Out"}
          </button>
        </form>
      </div>

      {latestError ? <p className="error" style={{ margin: 0 }}>{latestError}</p> : null}
      {!latestError && clockInState.ok ? <p className="muted" style={{ margin: 0 }}>Clock-in completed.</p> : null}
      {!latestError && clockOutState.ok ? <p className="muted" style={{ margin: 0 }}>Clock-out completed.</p> : null}
    </section>
  );
};

