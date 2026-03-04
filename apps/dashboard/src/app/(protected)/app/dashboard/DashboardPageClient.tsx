"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRightLeft,
  Bell,
  Building2,
  CalendarDays,
  Clock3,
  Compass,
  CreditCard,
  LayoutGrid,
  MessageSquare,
  NotebookPen,
  ShieldCheck
} from "lucide-react";
import {
  TENANT_NAVIGATION_ITEMS,
  resolveVisibleNavigationItems,
  type NavigationItem
} from "@/navigation/navigation.config";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type EntitlementsPayload = {
  entitlements: Record<string, unknown>;
  seatSummary?: {
    activeBillable: number;
    seatLimit: number | null;
  } | null;
};

type DashboardPageClientProps = {
  role: string | null;
  permissions: string[];
  hasEmployeeContext: boolean;
};

type QuickAction = {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
};

const fetchEntitlements = async (): Promise<EntitlementsPayload | null> => {
  const response = await fetch("/api/billing/entitlements", { cache: "no-store" });
  const payload = (await response.json()) as { ok?: boolean; data?: EntitlementsPayload };
  if (!response.ok || !payload.ok || !payload.data) {
    return null;
  }
  return payload.data;
};

const countEnabledFeatures = (entitlements: Record<string, unknown> | null): number => {
  if (!entitlements) return 0;
  return Object.entries(entitlements).filter(([key, value]) => key.startsWith("feature.") && value === true).length;
};

const EMPLOYEE_QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/app/attendance",
    label: "Clock In / Out",
    description: "Track today's attendance",
    icon: <Clock3 size={18} />
  },
  {
    href: "/app/leave",
    label: "Apply Leave",
    description: "Submit and track requests",
    icon: <CalendarDays size={18} />
  },
  {
    href: "/app/shift-swaps",
    label: "Request Shift Swap",
    description: "Propose shift exchange",
    icon: <ArrowRightLeft size={18} />
  },
  {
    href: "/app/chat",
    label: "Open Team Chat",
    description: "Collaborate with your team",
    icon: <MessageSquare size={18} />
  },
  {
    href: "/app/calendar",
    label: "Open Work Calendar",
    description: "Holidays, shifts, and leave calendar",
    icon: <Compass size={18} />
  },
  {
    href: "/app/notes",
    label: "My Notes",
    description: "Save personal work notes and links",
    icon: <NotebookPen size={18} />
  },
  {
    href: "/app/notifications",
    label: "Notifications",
    description: "Review updates and reminders",
    icon: <Bell size={18} />
  }
];

export const DashboardPageClient = ({
  role,
  permissions,
  hasEmployeeContext
}: DashboardPageClientProps) => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entitlements, setEntitlements] = useState<Record<string, unknown> | null>(null);
  const [seatSummary, setSeatSummary] = useState<EntitlementsPayload["seatSummary"]>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);

    void fetchEntitlements()
      .then((data) => {
        if (!active) return;
        setEntitlements(data?.entitlements ?? null);
        setSeatSummary(data?.seatSummary ?? null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Unable to load dashboard context");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const persona = resolveDashboardPersona({ role, permissions });

  const visibleItems = useMemo(
    () =>
      resolveVisibleNavigationItems(TENANT_NAVIGATION_ITEMS, {
        permissions,
        hasEmployeeContext,
        entitlements
      }),
    [permissions, hasEmployeeContext, entitlements]
  );

  const enabledFeatureCount = useMemo(() => countEnabledFeatures(entitlements), [entitlements]);
  const moduleCount = visibleItems.length;

  if (loading && persona !== "employee") return <LoadingState label="Loading dashboard..." />;
  if (loadError && persona !== "employee") return <ErrorState message={loadError} />;

  if (persona === "platform_owner") {
    return (
      <Card className="ui-refined-card rounded-2xl border border-[var(--line)] shadow-sm">
        <CardHeader className="space-y-4">
          <div>
            <CardTitle className="mb-2">Platform Owner Workspace</CardTitle>
            <CardDescription className="text-sm text-[var(--muted)]">
              Use the isolated platform shell for global operations.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/platform" className="secondary-btn">
            Open Platform Shell
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (persona === "employee") {
    return (
      <div className="space-y-8 fade-in">
        <Card className="ui-refined-card rounded-2xl border border-[var(--line)] shadow-sm">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="mb-2">My Daily Work Workspace</CardTitle>
              <CardDescription className="text-sm text-[var(--muted)]">
                Focus on today&apos;s shift, attendance, leave, and team updates.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="quick-action-grid">
              {EMPLOYEE_QUICK_ACTIONS.map((action) => (
                <Link key={action.href} href={action.href} className="group block">
                  <Card className="ui-refined-card rounded-xl border border-[var(--line)] shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <span className="action-card__icon action-card__icon--muted">{action.icon}</span>
                        <div className="min-w-0">
                          <p className="mb-1 font-semibold leading-none">{action.label}</p>
                          <p className="text-sm text-[var(--muted)]">{action.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="ui-refined-card metric-card metric-card--info rounded-xl border border-[var(--line)] shadow-sm">
            <CardHeader className="space-y-2">
              <CardDescription className="text-sm text-[var(--muted)]">Today&apos;s shift</CardDescription>
              <CardTitle>09:00 - 18:00</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="muted">Attendance status</span>
                <span className="badge badge--info">Not clocked in</span>
              </div>
              <div className="mini-chart">
                <span style={{ height: "34%" }} />
                <span style={{ height: "56%" }} />
                <span style={{ height: "48%" }} />
                <span style={{ height: "62%" }} />
                <span style={{ height: "52%" }} />
                <span style={{ height: "20%" }} />
                <span style={{ height: "18%" }} />
              </div>
            </CardContent>
          </Card>

          <Card className="ui-refined-card metric-card metric-card--success rounded-xl border border-[var(--line)] shadow-sm">
            <CardHeader className="space-y-2">
              <CardDescription className="text-sm text-[var(--muted)]">Hours this week</CardDescription>
              <CardTitle>0h</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <span className="muted">On-time: 0 | Late: 0</span>
              <div className="signal-row signal-row--success">
                <span className="signal-row__label">Trend vs last week</span>
                <span className="signal-row__value">No change</span>
              </div>
            </CardContent>
          </Card>

          <Card className="ui-refined-card metric-card metric-card--warning rounded-xl border border-[var(--line)] shadow-sm">
            <CardHeader className="space-y-2">
              <CardDescription className="text-sm text-[var(--muted)]">Leave balance</CardDescription>
              <CardTitle>CL 0 | SL 0 | AL 0</CardTitle>
            </CardHeader>
            <CardContent className="split-donut">
              <svg className="donut" viewBox="0 0 42 42" aria-hidden="true">
                <circle className="donut__bg" cx="21" cy="21" r="15.9155" strokeWidth="4" />
                <circle className="split-donut__a" cx="21" cy="21" r="15.9155" strokeWidth="4" strokeDasharray="75 25" strokeDashoffset="25" />
                <circle className="split-donut__b" cx="21" cy="21" r="15.9155" strokeWidth="4" strokeDasharray="25 75" strokeDashoffset="0" />
              </svg>
              <div className="split-donut__legend">
                <span><i className="split-donut__dot split-donut__dot--a" /> Used</span>
                <span><i className="split-donut__dot split-donut__dot--b" /> Remaining</span>
              </div>
            </CardContent>
          </Card>

          <Card className="ui-refined-card metric-card metric-card--danger rounded-xl border border-[var(--line)] shadow-sm">
            <CardHeader className="space-y-2">
              <CardDescription className="text-sm text-[var(--muted)]">Notifications</CardDescription>
              <CardTitle>0</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <span className="muted">Unread updates</span>
              <div className="signal-row">
                <span className="signal-row__label">Priority alerts</span>
                <span className="signal-row__value">0</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="ui-refined-card dashboard-panel dashboard-panel--spotlight rounded-2xl border border-[var(--line)] shadow-sm">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="mb-2">Upcoming Events</CardTitle>
              <CardDescription className="text-sm text-[var(--muted)]">
                Holidays, approved leaves, and company announcements.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="dashboard-timeline">
              <div className="dashboard-timeline__item">
                <span className="dashboard-timeline__dot" />
                <div className="dashboard-timeline__content">
                  <strong>No upcoming holidays configured</strong>
                  <span className="muted">Your company calendar events will appear here.</span>
                </div>
                <span className="dashboard-timeline__meta">--</span>
              </div>
              <div className="dashboard-timeline__item">
                <span className="dashboard-timeline__dot" />
                <div className="dashboard-timeline__content">
                  <strong>No approved leaves pending</strong>
                  <span className="muted">Approved leave requests show with dates and status.</span>
                </div>
                <span className="dashboard-timeline__meta">--</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="stack fade-in">
      <Card className="dashboard-hero dashboard-hero--executive">
        <div className="dashboard-hero__content">
          <span className="dashboard-hero__eyebrow">Command center</span>
          <h2 className="dashboard-hero__title">Workspace dashboard</h2>
          <p className="dashboard-hero__subtitle">
            Unified view of role-based modules and plan-entitled capabilities. Use this as the
            single launch point for operations.
          </p>
        </div>
        <div className="dashboard-hero__actions">
          <Badge variant="info">{(role ?? "employee").toUpperCase()}</Badge>
          <Badge variant="default">Modules {moduleCount}</Badge>
        </div>
      </Card>

      <div className="grid-4">
        <Card className="metric-card metric-card--info">
          <CardHeader>
            <CardDescription>Available modules</CardDescription>
            <CardTitle>{moduleCount}</CardTitle>
          </CardHeader>
          <CardContent className="muted">Permission and plan scoped navigation</CardContent>
        </Card>

        <Card className="metric-card metric-card--success">
          <CardHeader>
            <CardDescription>Enabled features</CardDescription>
            <CardTitle>{enabledFeatureCount}</CardTitle>
          </CardHeader>
          <CardContent className="muted">Resolved from billing entitlements</CardContent>
        </Card>

        <Card className="metric-card metric-card--warning">
          <CardHeader>
            <CardDescription>Active seats</CardDescription>
            <CardTitle>{seatSummary?.activeBillable ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="muted">
            Limit {seatSummary?.seatLimit ?? "Custom"}
          </CardContent>
        </Card>

        <Card className="metric-card metric-card--danger">
          <CardHeader>
            <CardDescription>Security mode</CardDescription>
            <CardTitle>Enforced</CardTitle>
          </CardHeader>
          <CardContent className="muted">Role + plan + tenant checks active</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module launcher</CardTitle>
          <CardDescription>Only modules you can access are shown here.</CardDescription>
        </CardHeader>
        <CardContent>
          {visibleItems.length === 0 ? (
            <p className="muted">No modules are currently enabled for this account.</p>
          ) : (
            <div className="quick-action-grid">
              {visibleItems.map((item) => (
                <ModuleCard key={item.href} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ModuleCard = ({ item }: { item: NavigationItem }) => {
  const icon = resolveModuleIcon(item.href);
  return (
    <Link href={item.href} className="action-card">
      <span className="action-card__icon">{icon}</span>
      <span className="action-card__content">
        <strong>{item.label}</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          Open {item.label.toLowerCase()} workspace
        </span>
      </span>
    </Link>
  );
};

const resolveModuleIcon = (href: string) => {
  if (href.includes("billing")) return <CreditCard size={14} />;
  if (href.includes("monitoring")) return <ShieldCheck size={14} />;
  if (href.includes("employees")) return <Building2 size={14} />;
  return <LayoutGrid size={14} />;
};
