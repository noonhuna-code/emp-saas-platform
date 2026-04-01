"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  canStartBreak,
  canEndBreak,
  clockInAction,
  clockOutAction,
  startBreakAction,
  endBreakAction,
  onCompleted
}: {
  employeeId: string;
  locked: boolean;
  canClockIn: boolean;
  canClockOut: boolean;
  canStartBreak: boolean;
  canEndBreak: boolean;
  clockInAction: ClockServerAction;
  clockOutAction: ClockServerAction;
  startBreakAction: ClockServerAction;
  endBreakAction: ClockServerAction;
  onCompleted?: () => void;
}) => {
  const [clockInState, clockInFormAction, clockInPending] = useActionState(clockInAction, INITIAL_STATE);
  const [clockOutState, clockOutFormAction, clockOutPending] = useActionState(clockOutAction, INITIAL_STATE);
  const [startBreakState, startBreakFormAction, startBreakPending] = useActionState(startBreakAction, INITIAL_STATE);
  const [endBreakState, endBreakFormAction, endBreakPending] = useActionState(endBreakAction, INITIAL_STATE);
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

  useEffect(() => {
    if (startBreakState.ok && startBreakState.completedAt) {
      onCompleted?.();
    }
  }, [startBreakState, onCompleted]);

  useEffect(() => {
    if (endBreakState.ok && endBreakState.completedAt) {
      onCompleted?.();
    }
  }, [endBreakState, onCompleted]);

  const latestActionState = useMemo(() => {
    const states = [clockInState, clockOutState, startBreakState, endBreakState].filter(
      (state) => typeof state.completedAt === "number"
    );
    if (states.length === 0) return null;
    return states.reduce((latest, state) =>
      (state.completedAt ?? 0) > (latest.completedAt ?? 0) ? state : latest
    );
  }, [clockInState, clockOutState, startBreakState, endBreakState]);

  const disabledAll = locked || clockInPending || clockOutPending || startBreakPending || endBreakPending || !employeeId;
  const latestError = latestActionState && !latestActionState.ok ? latestActionState.error ?? null : null;

  const guidance = useMemo(() => {
    if (!latestError) return null;
    const lower = latestError.toLowerCase();
    if (lower.includes("shift assignment")) return "Ask HR or your team lead to assign a shift template.";
    if (lower.includes("employee record")) return "HR needs to link your profile to an employee record.";
    if (lower.includes("permission")) return "Your role needs attendance access to clock in or out.";
    return null;
  }, [latestError]);

  const geoCoordsLabel = useMemo(() => {
    if (!geoPoint) return null;
    const lat = geoPoint.latitude.toFixed(5);
    const lng = geoPoint.longitude.toFixed(5);
    const acc = geoPoint.accuracy ? ` (+/-${Math.round(geoPoint.accuracy)}m)` : "";
    return `${lat}, ${lng}${acc}`;
  }, [geoPoint]);

  const geoLabel = useMemo(() => {
    if (geoStatus === "capturing") return "Capturing location…";
    if (geoStatus === "ready" && geoPoint) return "Location captured and ready for your next clock action.";
    if (geoStatus === "error") return geoError ?? "Location capture failed";
    return "Optional: capture location for geo-verified attendance logs.";
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <form action={clockInFormAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="source" value="web" />
          <input type="hidden" name="geoLatitude" value={geoPoint?.latitude ?? ""} />
          <input type="hidden" name="geoLongitude" value={geoPoint?.longitude ?? ""} />
          <input type="hidden" name="geoAccuracy" value={geoPoint?.accuracy ?? ""} />
          <Button type="submit" disabled={disabledAll || !canClockIn}>
            {clockInPending ? "Clocking in…" : "Clock in"}
          </Button>
        </form>

        <form action={clockOutFormAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="source" value="web" />
          <input type="hidden" name="geoLatitude" value={geoPoint?.latitude ?? ""} />
          <input type="hidden" name="geoLongitude" value={geoPoint?.longitude ?? ""} />
          <input type="hidden" name="geoAccuracy" value={geoPoint?.accuracy ?? ""} />
          <Button variant="secondary" type="submit" disabled={disabledAll || !canClockOut}>
            {clockOutPending ? "Clocking out…" : "Clock out"}
          </Button>
        </form>

        <form action={startBreakFormAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <Button variant="secondary" type="submit" disabled={disabledAll || !canStartBreak}>
            {startBreakPending ? "Starting break..." : "Start break"}
          </Button>
        </form>

        <form action={endBreakFormAction}>
          <input type="hidden" name="employeeId" value={employeeId} />
          <Button variant="secondary" type="submit" disabled={disabledAll || !canEndBreak}>
            {endBreakPending ? "Ending break..." : "End break"}
          </Button>
        </form>

        <Button type="button" variant="ghost" onClick={captureLocation} disabled={disabledAll || geoStatus === "capturing"}>
          <MapPin className="h-4 w-4" />
          {geoStatus === "capturing" ? "Locating…" : "Capture location"}
        </Button>

        {locked ? <Badge className="rounded-full px-3 py-1.5">Attendance locked</Badge> : null}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <ShieldCheck className="h-4 w-4" />
              Geo verification
            </div>
            <p className={geoStatus === "error" ? "text-sm text-red-600 dark:text-red-400" : "text-sm text-slate-600 dark:text-slate-400"}>{geoLabel}</p>
            {geoCoordsLabel ? <p className="text-sm font-medium text-slate-950 dark:text-slate-50">{geoCoordsLabel}</p> : null}
          </div>
          {geoStatus === "ready" ? <Badge className="rounded-full px-3 py-1.5">Ready</Badge> : null}
        </div>
      </div>

      {latestError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
          <p className="font-medium">{latestError}</p>
          {guidance ? <p className="mt-1 text-red-600/90 dark:text-red-300/90">{guidance}</p> : null}
        </div>
      ) : null}

      {!latestError && latestActionState?.ok && latestActionState === clockInState ? <p className="text-sm text-slate-500 dark:text-slate-400">Clock-in completed.</p> : null}
      {!latestError && latestActionState?.ok && latestActionState === clockOutState ? <p className="text-sm text-slate-500 dark:text-slate-400">Clock-out completed.</p> : null}
      {!latestError && latestActionState?.ok && latestActionState === startBreakState ? <p className="text-sm text-slate-500 dark:text-slate-400">Break started.</p> : null}
      {!latestError && latestActionState?.ok && latestActionState === endBreakState ? <p className="text-sm text-slate-500 dark:text-slate-400">Break ended.</p> : null}
    </div>
  );
};

