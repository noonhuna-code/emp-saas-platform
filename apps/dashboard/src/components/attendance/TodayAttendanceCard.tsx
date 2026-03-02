import type { AttendanceTodayResponse } from "@/lib/types/attendance";

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

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ margin: 0 }}>Today Attendance</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {prettyCurrentStatus(data.currentStatus)}
            {data.isOnBreak ? " - break running" : ""}
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span className="badge">Status: {record?.status ?? "N/A"}</span>
          <span className="badge">{record?.is_locked ? "Locked" : "Unlocked"}</span>
          {(record?.late_minutes ?? 0) > 0 ? <span className="badge">Late</span> : null}
          {(record?.overtime_minutes ?? 0) > 0 ? <span className="badge">Overtime</span> : null}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
        }}
      >
        <div className="card" style={{ padding: 12 }}>
          <div className="muted">Clock In</div>
          <div>{formatDateTime(record?.check_in)}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="muted">Clock Out</div>
          <div>{formatDateTime(record?.check_out)}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="muted">Worked</div>
          <div>{formatMinutes(record?.work_minutes)}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="muted">Overtime</div>
          <div>{formatMinutes(record?.overtime_minutes)}</div>
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div className="muted">Geo Verification</div>
          <div style={{ display: "grid", gap: 4 }}>
            <span>
              {data.latestGeoEvent
                ? `${data.latestGeoEvent.latitude.toFixed(4)}, ${data.latestGeoEvent.longitude.toFixed(4)}`
                : "No location captured"}
            </span>
            <span className="muted" style={{ fontSize: 12 }}>
              {data.latestGeoEvent ? formatDateTime(data.latestGeoEvent.captured_at) : "Capture location before clocking in/out"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};