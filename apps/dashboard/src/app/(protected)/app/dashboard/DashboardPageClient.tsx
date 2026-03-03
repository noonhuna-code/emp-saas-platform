"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Bell,
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  LayoutGrid,
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

  if (loading) return <LoadingState label="Loading dashboard..." />;
  if (loadError) return <ErrorState message={loadError} />;

  if (persona === "platform_owner") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Platform Owner Workspace</CardTitle>
          <CardDescription>Use the isolated platform shell for global operations.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/platform" className="secondary-btn">
            Open Platform Shell
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (persona === "employee") {
    return (
      <div className="stack fade-in">
        <Card className="dashboard-panel dashboard-panel--soft">
          <CardHeader>
            <CardTitle>My Daily Work Workspace</CardTitle>
            <CardDescription>Focus on today&apos;s shift, attendance, leave, and team updates.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="quick-action-grid">
              <Link href="/app/attendance" className="action-card">
                <span className="action-card__icon">
                  <Clock3 size={14} />
                </span>
                <span className="action-card__content">
                  <strong>Clock In / Out</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Track today&apos;s attendance
                  </span>
                </span>
              </Link>
              <Link href="/app/leave" className="action-card">
                <span className="action-card__icon">
                  <CalendarDays size={14} />
                </span>
                <span className="action-card__content">
                  <strong>Apply Leave</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Submit and track requests
                  </span>
                </span>
              </Link>
              <Link href="/app/shift-swaps" className="action-card">
                <span className="action-card__icon">
                  <ArrowRightLeft size={14} />
                </span>
                <span className="action-card__content">
                  <strong>Request Shift Swap</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Propose shift exchange
                  </span>
                </span>
              </Link>
              <Link href="/app/chat" className="action-card">
                <span className="action-card__icon">
                  <Bell size={14} />
                </span>
                <span className="action-card__content">
                  <strong>Open Team Chat</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    Collaborate with your team
                  </span>
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid-4">
          <Card className="metric-card metric-card--info">
            <CardHeader>
              <CardDescription>Today&apos;s shift</CardDescription>
              <CardTitle>09:00 - 18:00</CardTitle>
            </CardHeader>
            <CardContent className="muted">Attendance status: Not clocked in</CardContent>
          </Card>
          <Card className="metric-card metric-card--success">
            <CardHeader>
              <CardDescription>Hours this week</CardDescription>
              <CardTitle>0h</CardTitle>
            </CardHeader>
            <CardContent className="muted">On-time: 0 | Late: 0</CardContent>
          </Card>
          <Card className="metric-card metric-card--warning">
            <CardHeader>
              <CardDescription>Leave balance</CardDescription>
              <CardTitle>CL 0 | SL 0 | AL 0</CardTitle>
            </CardHeader>
            <CardContent className="muted">Upcoming leave: None</CardContent>
          </Card>
          <Card className="metric-card metric-card--danger">
            <CardHeader>
              <CardDescription>Notifications</CardDescription>
              <CardTitle>0</CardTitle>
            </CardHeader>
            <CardContent className="muted">Unread updates</CardContent>
          </Card>
        </div>

        <Card className="dashboard-panel dashboard-panel--spotlight">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Holidays, approved leaves, and company announcements.</CardDescription>
          </CardHeader>
          <CardContent className="dashboard-timeline">
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
