"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorkspaceCalendar } from "@/lib/client/api";
import type { WorkspaceCalendarDay, WorkspaceCalendarResponse, WorkspaceCalendarEvent } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

const todayMonth = () => new Date().toISOString().slice(0, 7);

const shiftMonth = (month: string, delta: number): string => {
  const [yearText, monthText] = month.split("-");
  const base = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  base.setUTCMonth(base.getUTCMonth() + delta);
  return base.toISOString().slice(0, 7);
};

const weekdayLabel = (dateText: string): string => {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  return date.toLocaleDateString(undefined, { weekday: "short" });
};

const eventTone = (event: WorkspaceCalendarEvent): string => {
  if (event.type === "holiday") return "badge badge--warning";
  if (event.type === "leave") return event.status === "approved" ? "badge badge--success" : "badge badge--info";
  if (event.type === "attendance") return event.status === "absent" ? "badge badge--danger" : "badge";
  return "badge";
};

const WorkCalendarPageClient = () => {
  const [month, setMonth] = useState(todayMonth());
  const [data, setData] = useState<WorkspaceCalendarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<WorkspaceCalendarEvent["type"], boolean>>({
    holiday: true,
    leave: true,
    shift: true,
    attendance: true
  });

  const load = useCallback(async (targetMonth: string) => {
    setLoading(true);
    setError(null);
    const result = await fetchWorkspaceCalendar(targetMonth);
    if (!result.ok || !result.data) {
      setData(null);
      setError(result.error ?? "Unable to load workspace calendar");
      setLoading(false);
      return;
    }
    setData(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(month);
  }, [load, month]);

  const visibleDays = useMemo(() => {
    if (!data) return [];
    return data.days.map((day) => ({
      ...day,
      events: day.events.filter((event) => filters[event.type])
    }));
  }, [data, filters]);

  const toggleFilter = (type: WorkspaceCalendarEvent["type"]) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="stack" style={{ gap: 6 }}>
            <h1 style={{ margin: 0 }}>Work Calendar</h1>
            <p className="muted">
              Unified month view for shifts, leave, attendance, and Pakistan/company holidays.
            </p>
          </div>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <button type="button" className="secondary-btn" onClick={() => setMonth((prev) => shiftMonth(prev, -1))}>
              Previous
            </button>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            <button type="button" className="secondary-btn" onClick={() => setMonth((prev) => shiftMonth(prev, 1))}>
              Next
            </button>
          </div>
        </div>
      </section>

      {loading ? <LoadingState label="Loading work calendar..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error && data ? (
        <>
          <section className="grid-4">
            <article className="stat-card">
              <span className="stat-label">Entitled Leaves</span>
              <strong className="stat-value">{data.summary.entitled_leaves}</strong>
              <span className="stat-hint">Annual allocation</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Remaining Leaves</span>
              <strong className="stat-value">{data.summary.remaining_leaves}</strong>
              <span className="stat-hint">Used {data.summary.used_leaves}</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Shift Days</span>
              <strong className="stat-value">{data.summary.assigned_shift_days}</strong>
              <span className="stat-hint">Assigned in selected month</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">Holidays</span>
              <strong className="stat-value">{data.summary.holidays}</strong>
              <span className="stat-hint">Company + Pakistan calendar</span>
            </article>
          </section>

          <section className="card stack">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>Filters</h3>
              <div className="tabs">
                {(["holiday", "leave", "shift", "attendance"] as Array<WorkspaceCalendarEvent["type"]>).map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`tab ${filters[type] ? "tab--active" : ""}`}
                    onClick={() => toggleFilter(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <span className="badge">Company: {data.company_name ?? "-"}</span>
              <span className="badge">Timezone: {data.timezone}</span>
              <span className="badge">Team Lead: {data.team_lead_name ?? "Not assigned"}</span>
            </div>
          </section>

          <section className="calendar-grid">
            {visibleDays.map((day: WorkspaceCalendarDay) => (
              <article key={day.date} className={`calendar-day ${day.is_today ? "calendar-day--today" : ""}`}>
                <header className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong>{new Date(`${day.date}T00:00:00.000Z`).getUTCDate()}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>{weekdayLabel(day.date)}</span>
                </header>
                <div className="calendar-day__events">
                  {day.events.length === 0 ? <span className="muted" style={{ fontSize: 12 }}>No events</span> : null}
                  {day.events.slice(0, 5).map((event) => (
                    <span key={event.id} className={eventTone(event)} title={event.title}>
                      {event.title}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="grid-2">
            <article className="card stack">
              <h3 style={{ margin: 0 }}>Official Holidays</h3>
              {data.official_holidays.length === 0 ? <p className="muted">No holidays configured for this month.</p> : null}
              {data.official_holidays.map((holiday) => (
                <div key={`${holiday.date}-${holiday.name}`} className="signal-row">
                  <span className="signal-row__label">{holiday.name}</span>
                  <span className="signal-row__value">
                    {holiday.date} {holiday.source === "pakistan_estimated" ? "(estimated)" : "(company)"}
                  </span>
                </div>
              ))}
            </article>

            <article className="card stack">
              <h3 style={{ margin: 0 }}>Company Updates & Files</h3>
              {data.company_updates.length === 0 ? <p className="muted">No company updates published yet.</p> : null}
              {data.company_updates.map((item) => (
                <div key={item.id} className="signal-row">
                  <span className="signal-row__label">
                    <strong>{item.title}</strong>
                    <br />
                    <span className="muted">{item.resource_type}</span>
                  </span>
                  <span className="signal-row__value">
                    {item.link_url ? (
                      <a className="secondary-btn" href={item.link_url} target="_blank" rel="noreferrer">Open</a>
                    ) : item.file_url ? (
                      <a className="secondary-btn" href={item.file_url} target="_blank" rel="noreferrer">Download</a>
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
              ))}
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
};

export default WorkCalendarPageClient;
