"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  return (
    <Card
      className={cn(
        "rounded-xl border-border shadow-sm",
        emphasis === "executive" && "dashboard-hero dashboard-hero--executive",
        emphasis === "operations" && "dashboard-hero dashboard-hero--operations",
        emphasis === "default" && "dashboard-hero"
      )}
    >
      <CardHeader className="p-5 pb-3">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">{eyebrow}</p> : null}
        <CardTitle className="text-3xl leading-tight">{title}</CardTitle>
        <CardDescription className="text-sm">{subtitle}</CardDescription>
      </CardHeader>
      {actions ? <CardContent className="flex flex-wrap items-center gap-2 p-5 pt-0">{actions}</CardContent> : null}
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
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Dashboard mode</h2>
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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        "flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5",
        tone === "success" && "border-[color:rgba(22,163,74,0.35)]",
        tone === "warning" && "border-[color:rgba(245,158,11,0.35)]",
        tone === "danger" && "border-[color:rgba(220,38,38,0.35)]",
        tone === "info" && "border-[color:rgba(30,98,255,0.35)]"
      )}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
};

export const TimelineList = ({
  items
}: {
  items: Array<{ title: string; subtitle?: string; meta?: string }>;
}) => {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Card key={`${item.title}-${item.meta ?? ""}-${index}`} className="rounded-xl border-border shadow-sm">
          <CardContent className="grid grid-cols-[auto_1fr_auto] items-start gap-3 p-4">
            <span
              className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(30,98,255,0.12)]"
              aria-hidden="true"
            />
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

