"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Filter, Landmark, Sparkles } from "lucide-react";
import { fetchWorkspaceCalendar, peekCachedResult } from "@/lib/client/api";
import type { WorkspaceCalendarDay, WorkspaceCalendarResponse, WorkspaceCalendarEvent } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/StatusChip";
import { MiniBarChart } from "@/components/shared/Charts";
import { PageContainer, PageHeader } from "@/components/dashboard-v2/PagePrimitives";

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

const abbreviationForLeaveTitle = (title: string): string => {
  const normalized = title.trim().toLowerCase();
  if (normalized.includes("annual leave")) return "AL";
  if (normalized.includes("casual leave")) return "CL";
  if (normalized.includes("sick leave")) return "SL";
  if (normalized.includes("maternity")) return "ML";
  if (normalized.includes("unpaid")) return "Unpaid Leave";
  return title;
};

const compactHolidayLabel = (title: string): string => {
  const normalized = title.trim();
  const lower = normalized.toLowerCase();

  if (lower.includes("eid ul fitr")) return "Eid ul Fitr";
  if (lower.includes("eid ul adha")) return "Eid ul Adha";
  if (lower.includes("ashura")) return "Ashura";
  if (lower.includes("eid milad")) return "Eid Milad";
  if (lower.includes("ramadan start")) return "Ramadan";
  if (lower.includes("pakistan day")) return "Pakistan Day";
  if (lower.includes("kashmir day")) return "Kashmir Day";
  if (lower.includes("labour day")) return "Labour Day";
  if (lower.includes("independence day")) return "Independence Day";
  if (lower.includes("quaid-e-azam")) return "Quaid Day";
  if (lower.includes("christmas")) return "Christmas";

  return normalized.replace(/\s*\(estimated\)\s*/gi, "").trim();
};

const monthLabel = (month: string) => {
  const [yearText, monthText] = month.split("-");
  const parsed = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, 1));
  return parsed.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const displayEventLabel = (event: WorkspaceCalendarEvent): string => {
  if (event.status === "go_active") return "P.GO";
  if (event.status === "go_applied") return "GO";
  if (event.status === "leave_paid") return abbreviationForLeaveTitle(event.title);
  if (event.status === "leave_unpaid") return "Unpaid Leave";
  if (event.status === "absent") return "A";
  if (event.status === "off_day") return "";
  if (event.status === "late") return "P (Late)";
  if (event.type === "attendance" && event.status === "present") return "P";
  if (event.type === "attendance" && event.status === "clocked_out") return "P";
  if (event.type === "attendance" && event.status === "on_break") return "P";
  if (event.type === "holiday") return event.title.includes("GO") ? event.title : compactHolidayLabel(event.title);
  if (event.type === "shift") return "";
  return event.title;
};

const eventTone = (event: WorkspaceCalendarEvent): "info" | "success" | "warning" | "danger" | "default" => {
  if (event.status === "go_active" || event.status === "go_applied") return "warning";
  if (event.status === "leave_paid") return "success";
  if (event.status === "leave_unpaid" || event.status === "absent") return "danger";
  if (event.status === "off_day") return "default";
  if (event.type === "holiday") return "warning";
  if (event.type === "leave") return event.status === "approved" ? "success" : "info";
  if (event.type === "attendance") return event.status === "late" ? "warning" : "default";
  if (event.type === "shift") return "info";
  return "default";
};

const compactEventLabel = (event: WorkspaceCalendarEvent): string => {
  if (event.status === "go_active") return "P.GO";
  if (event.status === "leave_paid") return abbreviationForLeaveTitle(event.title);
  if (event.status === "go_active") return "P · GO";
  if (event.status === "go_applied") return "GO";
  if (event.status === "leave_unpaid") return "Unpaid Leave";
  if (event.status === "leave_paid") return event.title;
  if (event.status === "absent") return "A";
  if (event.status === "off_day") return "";
  if (event.status === "late") return "P (Late)";
  if (event.type === "attendance" && event.status === "present") return "P";
  if (event.type === "attendance" && event.status === "clocked_out") return "P";
  if (event.type === "attendance" && event.status === "on_break") return "P";
  if (event.type === "holiday") return event.title.includes("GO") ? event.title : "Holiday";
  if (event.type === "shift") return "";
  return event.title;
};

void compactEventLabel;

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

const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WorkCalendarPageClient = () => {
  const initialMonth = todayMonth();
  const [month, setMonth] = useState(initialMonth);
  const initialCached = peekCachedResult<WorkspaceCalendarResponse>(`/api/workspace/calendar?month=${initialMonth}`);

  const [data, setData] = useState<WorkspaceCalendarResponse | null>(initialCached?.ok ? (initialCached.data ?? null) : null);
  const [loading, setLoading] = useState(!(initialCached?.ok && initialCached.data));
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<WorkspaceCalendarEvent["type"], boolean>>({
    holiday: true,
    leave: true,
    shift: true,
    attendance: true
  });

  const load = useCallback(async (targetMonth: string) => {
    const cached = peekCachedResult<WorkspaceCalendarResponse>(`/api/workspace/calendar?month=${targetMonth}`);
    if (cached?.ok && cached.data) {
      setData(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);
    const result = await fetchWorkspaceCalendar(targetMonth);
    if (!result.ok || !result.data) {
      setData((prev) => prev ?? buildFallbackCalendar(targetMonth));
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

  const eventLoadSeries = useMemo(() => {
    if (!data) return [] as number[];
    return data.days.map((day) => Math.max(1, day.events.length));
  }, [data]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Calendar"
        title={monthLabel(month)}
        description="Unified shift, leave, attendance, and company holiday timeline for the current workspace."
        chips={["Shifts", "Leave", "Attendance", "Company updates"]}
        actions={(
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
            <button type="button" className="secondary-btn" onClick={() => setMonth((prev) => shiftMonth(prev, -1))}>
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button type="button" className="secondary-btn" onClick={() => setMonth((prev) => shiftMonth(prev, 1))}>
              Next <ChevronRight className="h-4 w-4" />
            </button>
            <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </div>
        )}
      />

      {loading ? <LoadingState label="Loading work calendar..." /> : null}
      {!loading && error ? (
        <Card className="rounded-xl border-[color:rgba(245,158,11,0.45)] bg-[rgba(245,158,11,0.08)]">
          <CardContent className="p-5">
            <p className="text-sm text-[var(--warning)]">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {!loading && data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-xl border-border shadow-sm">
              <CardContent className="space-y-1 p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Entitled leaves</p>
                <p className="text-3xl font-semibold">{data.summary.entitled_leaves}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-sm">
              <CardContent className="space-y-1 p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Remaining leaves</p>
                <p className="text-3xl font-semibold">{data.summary.remaining_leaves}</p>
                <p className="text-xs text-muted-foreground">Used {data.summary.used_leaves}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-sm">
              <CardContent className="space-y-1 p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Shift days</p>
                <p className="text-3xl font-semibold">{data.summary.assigned_shift_days}</p>
              </CardContent>
            </Card>
            <Card className="rounded-xl border-border shadow-sm">
              <CardContent className="space-y-1 p-5">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Holidays</p>
                <p className="text-3xl font-semibold">{data.summary.holidays}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4" /> Calendar filters</p>
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
                <StatusChip label={`Reporting lead: ${data.team_lead_name ?? "Not assigned"}`} compact />
              </div>
              {eventLoadSeries.length > 0 ? <MiniBarChart values={eventLoadSeries} height={40} /> : null}
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="calendar-grid calendar-grid--weekdays text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {weekdayNames.map((name) => (
                  <div key={name} className="rounded-md border border-border bg-[var(--surface-1)] px-2 py-2 text-center">{name}</div>
                ))}
              </div>

              <section className="calendar-grid">
                {visibleDays.map((day: WorkspaceCalendarDay) => {
                    const displayEvents = day.events
                      .map((event) => ({
                        event,
                        label: displayEventLabel(event)
                      }))
                      .filter((item) => item.label.trim().length > 0);

                  return (
                    <article key={day.date} className={`calendar-day ${day.is_today ? "calendar-day--today" : ""}`}>
                      <header className="flex items-baseline justify-between gap-2">
                        <strong>{new Date(`${day.date}T00:00:00.000Z`).getUTCDate()}</strong>
                        <span className="text-xs text-muted-foreground">{weekdayLabel(day.date)}</span>
                      </header>
                      <div className="calendar-day__events">
                        {displayEvents.slice(0, 4).map(({ event, label }) => (
                          <span key={event.id} className={`calendar-event-chip calendar-event-chip--${eventTone(event)}`} title={event.title}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </section>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card className="rounded-xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Landmark className="h-4 w-4" /> Official Holidays</CardTitle>
              </CardHeader>
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

            <Card className="rounded-xl border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="h-4 w-4" /> Company Updates & Files</CardTitle>
              </CardHeader>
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
    </PageContainer>
  );
};

export default WorkCalendarPageClient;
