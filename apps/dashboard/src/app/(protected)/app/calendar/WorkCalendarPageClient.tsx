"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWorkspaceCalendar } from "@/lib/client/api";
import type { WorkspaceCalendarDay, WorkspaceCalendarResponse, WorkspaceCalendarEvent } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/StatusChip";

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

const buildFallbackCalendar = (month: string): WorkspaceCalendarResponse => {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  const days: WorkspaceCalendarDay[] = [];
  const today = new Date().toISOString().slice(0, 10);
  const cursor = new Date(start);

  while (cursor <= end) {
    const dateText = cursor.toISOString().slice(0, 10);
    days.push({
      date: dateText,
      is_today: dateText === today,
      events: []
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return {
    month,
    range_start: start.toISOString().slice(0, 10),
    range_end: end.toISOString().slice(0, 10),
    timezone: "Asia/Karachi",
    company_name: null,
    team_lead_name: null,
    summary: {
      entitled_leaves: 0,
      used_leaves: 0,
      remaining_leaves: 0,
      approved_leave_days: 0,
      pending_leave_days: 0,
      assigned_shift_days: 0,
      holidays: 0
    },
    official_holidays: [],
    company_updates: [],
    days
  };
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
      setData(buildFallbackCalendar(targetMonth));
      setError(result.error ?? "Calendar data is temporarily unavailable. Showing a basic month view.");
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
    <div className="page-wrap space-y-8">
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Work Calendar</CardTitle>
              <p className="text-sm text-muted-foreground">Unified month view for shifts, leave, attendance, and Pakistan/company holidays.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="secondary-btn" onClick={() => setMonth((prev) => shiftMonth(prev, -1))}>Previous</button>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
              <button type="button" className="secondary-btn" onClick={() => setMonth((prev) => shiftMonth(prev, 1))}>Next</button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading ? <LoadingState label="Loading work calendar..." /> : null}
      {!loading && error ? (
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-[var(--warning)]">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardContent className="space-y-1 p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Entitled Leaves</p><p className="text-3xl font-semibold">{data.summary.entitled_leaves}</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Remaining Leaves</p><p className="text-3xl font-semibold">{data.summary.remaining_leaves}</p><p className="text-xs text-muted-foreground">Used {data.summary.used_leaves}</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Shift Days</p><p className="text-3xl font-semibold">{data.summary.assigned_shift_days}</p></CardContent></Card>
            <Card><CardContent className="space-y-1 p-5"><p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Holidays</p><p className="text-3xl font-semibold">{data.summary.holidays}</p></CardContent></Card>
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold">Filters</p>
                <div className="flex flex-wrap gap-2">
                  {(["holiday", "leave", "shift", "attendance"] as Array<WorkspaceCalendarEvent["type"]>).map((type) => (
                    <button key={type} type="button" className={`tab ${filters[type] ? "tab--active" : ""}`} onClick={() => toggleFilter(type)}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusChip label={`Company: ${data.company_name ?? "-"}`} compact />
                <StatusChip label={`Timezone: ${data.timezone}`} compact />
                <StatusChip label={`Team Lead: ${data.team_lead_name ?? "Not assigned"}`} compact />
              </div>
            </CardContent>
          </Card>

          <section className="calendar-grid">
            {visibleDays.map((day: WorkspaceCalendarDay) => (
              <article key={day.date} className={`calendar-day ${day.is_today ? "calendar-day--today" : ""}`}>
                <header className="flex items-baseline justify-between gap-2">
                  <strong>{new Date(`${day.date}T00:00:00.000Z`).getUTCDate()}</strong>
                  <span className="text-xs text-muted-foreground">{weekdayLabel(day.date)}</span>
                </header>
                <div className="calendar-day__events">
                  {day.events.length === 0 ? <span className="text-xs text-muted-foreground">No events</span> : null}
                  {day.events.slice(0, 5).map((event) => (
                    <span key={event.id} className={eventTone(event)} title={event.title}>{event.title}</span>
                  ))}
                </div>
              </article>
            ))}
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Official Holidays</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.official_holidays.length === 0 ? <p className="text-sm text-muted-foreground">No holidays configured for this month.</p> : null}
                {data.official_holidays.map((holiday) => (
                  <div key={`${holiday.date}-${holiday.name}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">{holiday.name}</span>
                    <span className="text-sm font-medium">{holiday.date} {holiday.source === "pakistan_estimated" ? "(estimated)" : "(company)"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Company Updates & Files</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.company_updates.length === 0 ? <p className="text-sm text-muted-foreground">No company updates published yet.</p> : null}
                {data.company_updates.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                    <span className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{item.title}</strong> | {item.resource_type}
                    </span>
                    <span className="flex items-center gap-2">
                      {item.link_url ? <a className="secondary-btn" href={item.link_url} target="_blank" rel="noreferrer">Open</a> : null}
                      {item.file_url ? <a className="secondary-btn" href={item.file_url} target="_blank" rel="noreferrer">Download</a> : null}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default WorkCalendarPageClient;