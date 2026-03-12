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
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {prettyCurrentStatus(data.currentStatus)}
            {data.isOnBreak ? " and currently on break." : " for today’s assigned shift."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="rounded-full px-3 py-1.5">{record?.status ?? "N/A"}</Badge>
          <Badge className="rounded-full px-3 py-1.5">{record?.is_locked ? "Locked" : "Unlocked"}</Badge>
          {(record?.late_minutes ?? 0) > 0 ? <Badge className="rounded-full px-3 py-1.5">Late</Badge> : null}
          {(record?.overtime_minutes ?? 0) > 0 ? <Badge className="rounded-full px-3 py-1.5">Overtime</Badge> : null}
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

