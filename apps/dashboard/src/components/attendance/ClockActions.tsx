"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

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
  const [geoStatus, setGeoStatus] = useState<"idle" | "capturing" | "ready" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoPoint, setGeoPoint] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);

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
  const geoLabel = useMemo(() => {
    if (geoStatus === "capturing") return "Capturing location...";
    if (geoStatus === "ready" && geoPoint) {
      const lat = geoPoint.latitude.toFixed(5);
      const lng = geoPoint.longitude.toFixed(5);
      return `Location ready (${lat}, ${lng})`;
    }
    if (geoStatus === "error") return geoError ?? "Location capture failed";
    return "Optional: capture location for geo-verified attendance logs";
  }, [geoStatus, geoPoint, geoError]);

  const captureLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("error");
      setGeoError("Geolocation is not supported in this browser.");
      return;
    }

    setGeoStatus("capturing");
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoPoint({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null
        });
        setGeoStatus("ready");
      },
      (error) => {
        setGeoStatus("error");
        setGeoError(error.message || "Unable to capture location.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

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
          <input type="hidden" name="geoLatitude" value={geoPoint?.latitude ?? ""} />
          <input type="hidden" name="geoLongitude" value={geoPoint?.longitude ?? ""} />
          <input type="hidden" name="geoAccuracy" value={geoPoint?.accuracy ?? ""} />
          <button className="primary-btn" type="submit" disabled={disabledAll || !canClockIn}>
            {clockInPending ? "Clocking In..." : "Clock In"}
          </button>
        </form>

        <form action={clockOutFormAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="source" value="web" />
          <input type="hidden" name="geoLatitude" value={geoPoint?.latitude ?? ""} />
          <input type="hidden" name="geoLongitude" value={geoPoint?.longitude ?? ""} />
          <input type="hidden" name="geoAccuracy" value={geoPoint?.accuracy ?? ""} />
          <button className="secondary-btn" type="submit" disabled={disabledAll || !canClockOut}>
            {clockOutPending ? "Clocking Out..." : "Clock Out"}
          </button>
        </form>

        <button type="button" className="ghost-btn" onClick={captureLocation} disabled={disabledAll || geoStatus === "capturing"}>
          {geoStatus === "capturing" ? "Locating..." : "Capture location"}
        </button>
      </div>

      <p className={geoStatus === "error" ? "error" : "muted"} style={{ margin: 0 }}>{geoLabel}</p>
      {latestError ? <p className="error" style={{ margin: 0 }}>{latestError}</p> : null}
      {!latestError && clockInState.ok ? <p className="muted" style={{ margin: 0 }}>Clock-in completed.</p> : null}
      {!latestError && clockOutState.ok ? <p className="muted" style={{ margin: 0 }}>Clock-out completed.</p> : null}
    </section>
  );
};
