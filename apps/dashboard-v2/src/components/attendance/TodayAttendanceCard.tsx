import type { AttendanceTodayResponse } from "@/lib/types/attendance";
import { Badge } from "@/components/ui/badge";

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const formatMinutes = (value: number | null | undefined): string => {
  if (typeof value !== "number") return "-";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${hours}h ${minutes}m`;
};

const prettyCurrentStatus = (status: AttendanceTodayResponse["currentStatus"]): string => {
  switch (status) {
    case "clocked_in":
      return "Clocked in";
    case "clocked_out":
      return "Clocked out";
    case "on_break":
      return "On break";
    case "not_clocked_in":
    default:
      return "Not clocked in";
  }
};

const prettyDayState = (state: AttendanceTodayResponse["dayState"]): string => {
  switch (state) {
    case "go_active":
      return "GO Active";
    case "go_applied":
      return "GO Applied";
    case "leave_unpaid":
      return "Unpaid leave";
    case "leave_paid":
      return "Paid leave";
    case "off_day":
      return "Off day";
    default:
      return state.replace(/_/g, " ");
  }
};

const stateDescription = (data: AttendanceTodayResponse): string => {
  switch (data.dayState) {
    case "off_day":
      return "No roster workday is assigned today, so there is no deduction by default.";
    case "leave_paid":
      return `Approved ${data.leaveContext?.leave_type_name ?? "paid leave"} covers today.`;
    case "leave_unpaid":
      return `Approved ${data.leaveContext?.leave_type_name ?? "unpaid leave"} covers today and counts as a no-pay day.`;
    case "go_active":
      return `${data.holidayContext?.holiday_name ?? "Holiday"} is being treated as an extra payable worked day.`;
    case "go_applied":
      return `${data.holidayContext?.holiday_name ?? "Holiday"} is being treated as a compensated non-working GO day.`;
    case "absent":
      return "This date is marked absent from explicit attendance truth.";
    case "present":
      return data.currentStatus === "not_clocked_in"
        ? "A shift is scheduled today and the clock controls are available."
        : `${prettyCurrentStatus(data.currentStatus)} for the current workday.`;
    case "on_break":
    case "clocked_out":
    case "late":
      return "A shift is scheduled today and the clock controls are available.";
    default:
      return `${prettyCurrentStatus(data.currentStatus)} for the current workday.`;
  }
};

export const TodayAttendanceCard = ({ data }: { data: AttendanceTodayResponse }) => {
  const record = data.record;
  const geoCaptured = data.latestGeoEvent
    ? `${data.latestGeoEvent.latitude.toFixed(4)}, ${data.latestGeoEvent.longitude.toFixed(4)}`
    : "No location captured";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-50">Current attendance snapshot</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{stateDescription(data)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full px-3 py-1.5">{prettyDayState(data.dayState)}</Badge>
          <Badge className="rounded-full px-3 py-1.5">{data.payrollImpact.replace(/_/g, " ")}</Badge>
          <Badge className="rounded-full px-3 py-1.5">{record?.status ?? "N/A"}</Badge>
          <Badge className="rounded-full px-3 py-1.5">{record?.is_locked ? "Locked" : "Unlocked"}</Badge>
          {(record?.late_minutes ?? 0) > 0 ? <Badge className="rounded-full px-3 py-1.5">Late</Badge> : null}
          {(record?.overtime_minutes ?? 0) > 0 ? <Badge className="rounded-full px-3 py-1.5">Overtime</Badge> : null}
          {data.lateLoginRequest.exists ? (
            <Badge className="rounded-full px-3 py-1.5">
              Late Login {data.lateLoginRequest.status ?? "pending"}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Clock in</p>
          <p className="mt-2 text-base font-medium text-slate-950 dark:text-slate-50">{formatDateTime(record?.check_in)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Clock out</p>
          <p className="mt-2 text-base font-medium text-slate-950 dark:text-slate-50">{formatDateTime(record?.check_out)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Worked today</p>
          <p className="mt-2 text-base font-medium text-slate-950 dark:text-slate-50">{formatMinutes(record?.work_minutes)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Overtime</p>
          <p className="mt-2 text-base font-medium text-slate-950 dark:text-slate-50">{formatMinutes(record?.overtime_minutes)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 md:col-span-2 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Geo verification</p>
          <p className="mt-2 text-base font-medium text-slate-950 dark:text-slate-50">{geoCaptured}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {data.latestGeoEvent ? formatDateTime(data.latestGeoEvent.captured_at) : "Capture location before clocking in or out."}
          </p>
        </div>
      </div>
    </div>
  );
};

