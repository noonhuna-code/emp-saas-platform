"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { ActionCard } from "@/components/ui/ActionCard";
import { Tabs } from "@/components/shared/Tabs";
import { cn } from "@/lib/utils";

export type DashboardView = "workspace" | "analytics" | "operations";

export const DASHBOARD_VIEW_OPTIONS: Array<{ id: DashboardView; label: string }> = [
  { id: "workspace", label: "Workspace" },
  { id: "analytics", label: "Analytics" },
  { id: "operations", label: "Operations" }
];

const HERO_SIGNALS: Record<"default" | "executive" | "operations", Array<{ label: string; value: string }>> = {
  default: [
    { label: "Context", value: "Role-aware" },
    { label: "Scope", value: "Tenant-secure" },
    { label: "State", value: "Live" }
  ],
  executive: [
    { label: "Visibility", value: "Executive" },
    { label: "Metrics", value: "Decision-ready" },
    { label: "Signal", value: "Cross-team" }
  ],
  operations: [
    { label: "Workflow", value: "Action-ready" },
    { label: "Coverage", value: "Real-time" },
    { label: "Updates", value: "Synced" }
  ]
};

export const DashboardHero = ({
  eyebrow,
  title,
  subtitle,
  actions,
  emphasis = "default"
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  emphasis?: "default" | "executive" | "operations";
}) => {
  const signals = HERO_SIGNALS[emphasis] ?? HERO_SIGNALS.default;

  return (
    <Card
      className={cn(
        "dashboard-hero-shell rounded-xl border-border shadow-sm",
        emphasis === "executive" && "dashboard-hero dashboard-hero--executive",
        emphasis === "operations" && "dashboard-hero dashboard-hero--operations",
        emphasis === "default" && "dashboard-hero"
      )}
    >
      <CardContent className="dashboard-hero__layout p-6">
        <div className="dashboard-hero__body">
          <div className="dashboard-hero__content">
            {eyebrow ? <p className="dashboard-hero__eyebrow">{eyebrow}</p> : null}
            <div className="dashboard-hero__copy">
              <h2 className="dashboard-hero__title">{title}</h2>
              <p className="dashboard-hero__subtitle">{subtitle}</p>
            </div>
          </div>
          {actions ? <div className="dashboard-hero__actions">{actions}</div> : null}
        </div>
        <div className="dashboard-hero__signal-bar">
          {signals.map((signal) => (
            <span key={`${signal.label}-${signal.value}`} className="dashboard-hero__signal-pill">
              {signal.label}: {signal.value}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
export const DashboardModeSwitch = ({
  value,
  onChange
}: {
  value: DashboardView;
  onChange: (value: DashboardView) => void;
}) => {
  return (
    <div className="dashboard-mode-switch">
      <Tabs
        tabs={DASHBOARD_VIEW_OPTIONS}
        active={value}
        onChange={(next) => onChange((next as DashboardView) ?? "workspace")}
      />
    </div>
  );
};

export const DashboardKpiTile = ({
  label,
  value,
  hint,
  trend,
  accent = "default",
  footer
}: {
  label: string;
  value: string | number;
  hint?: string;
  trend?: string;
  accent?: "default" | "success" | "warning" | "danger" | "info";
  footer?: ReactNode;
}) => {
  return <MetricCard label={label} value={value} hint={hint} trend={trend} accent={accent} footer={footer} />;
};

export const DashboardPanel = ({
  title,
  subtitle,
  actions,
  children,
  tone = "default"
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  tone?: "default" | "soft" | "spotlight";
}) => {
  return (
    <SectionContainer title={title} subtitle={subtitle} actions={actions} tone={tone}>
      {children}
    </SectionContainer>
  );
};

export const ChartPanel = ({
  title,
  subtitle,
  actions,
  children
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <DashboardPanel title={title} subtitle={subtitle} actions={actions} tone="soft">
      {children}
    </DashboardPanel>
  );
};

export const WorkflowPanel = ({
  title,
  subtitle,
  actions,
  children
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) => {
  return (
    <DashboardPanel title={title} subtitle={subtitle} actions={actions} tone="spotlight">
      {children}
    </DashboardPanel>
  );
};

export const DashboardSection = ({
  visible,
  children
}: {
  visible: boolean;
  children: ReactNode;
}) => {
  if (!visible) return null;
  return <>{children}</>;
};

export const QuickActionGrid = ({
  actions
}: {
  actions: Array<{ label: string; href: string; caption?: string }>;
}) => {
  return (
    <div className="dashboard-quick-grid">
      {actions.map((action) => (
        <ActionCard key={`${action.href}-${action.label}`} href={action.href} title={action.label} description={action.caption} />
      ))}
    </div>
  );
};

export const SignalRow = ({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) => {
  return (
    <div
      className={cn(
        "dashboard-signal-row",
        tone === "success" && "dashboard-signal-row--success",
        tone === "warning" && "dashboard-signal-row--warning",
        tone === "danger" && "dashboard-signal-row--danger",
        tone === "info" && "dashboard-signal-row--info"
      )}
    >
      <span className="dashboard-signal-row__label">{label}</span>
      <span className="dashboard-signal-row__value">{value}</span>
    </div>
  );
};

export const TimelineList = ({
  items
}: {
  items: Array<{ title: string; subtitle?: string; meta?: string }>;
}) => {
  return (
    <div className="dashboard-timeline-list">
      {items.map((item, index) => (
        <Card key={`${item.title}-${item.meta ?? ""}-${index}`} className="dashboard-timeline-card rounded-xl border-border shadow-sm">
          <CardContent className="grid grid-cols-[auto_1fr_auto] items-start gap-3 p-4">
            <span className="dashboard-timeline-card__dot" aria-hidden="true" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold">{item.title}</p>
              {item.subtitle ? <p className="text-sm text-muted-foreground">{item.subtitle}</p> : null}
            </div>
            {item.meta ? <p className="text-xs text-muted-foreground">{item.meta}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};


