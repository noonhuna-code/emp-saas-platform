"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  BellDot,
  BookOpenText,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  ChartColumnBig,
  Clock3,
  HandCoins,
  LayoutGrid,
  MessageSquare,
  Network,
  ReceiptText,
  RefreshCw,
  ScrollText,
  Settings2,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards
} from "lucide-react";
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
    { label: "Scope", value: "Tenant secure" },
    { label: "Mode", value: "Operational" }
  ],
  executive: [
    { label: "Visibility", value: "Executive" },
    { label: "Metrics", value: "Decision ready" },
    { label: "Span", value: "Cross-team" }
  ],
  operations: [
    { label: "Workflow", value: "Action ready" },
    { label: "Coverage", value: "Live" },
    { label: "Focus", value: "Queue aware" }
  ]
};

export const DashboardHero = ({
  eyebrow,
  title,
  subtitle,
  actions,
  emphasis = "default",
  signals
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  emphasis?: "default" | "executive" | "operations";
  signals?: Array<{ label: string; value: string }>;
}) => {
  const resolvedSignals = signals?.length ? signals : HERO_SIGNALS[emphasis] ?? HERO_SIGNALS.default;

  return (
    <Card
      className={cn(
        "dashboard-hero-shell overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[0_18px_48px_rgba(15,23,42,0.07)]",
        emphasis === "executive" && "dashboard-hero dashboard-hero--executive",
        emphasis === "operations" && "dashboard-hero dashboard-hero--operations",
        emphasis === "default" && "dashboard-hero"
      )}
    >
      <CardContent className="dashboard-hero__layout gap-5 p-5 sm:p-6 xl:p-7">
        <div className="dashboard-hero__content min-w-0">
          {eyebrow ? <p className="dashboard-hero__eyebrow">{eyebrow}</p> : null}
          <div className="dashboard-hero__copy min-w-0">
            <h2 className="dashboard-hero__title">{title}</h2>
            <p className="dashboard-hero__subtitle">{subtitle}</p>
          </div>
          {actions ? <div className="dashboard-hero__actions min-w-0">{actions}</div> : null}
        </div>
        <div className="dashboard-hero__aside min-w-0">
          <div className="dashboard-hero__signal-grid">
            {resolvedSignals.map((signal) => (
              <div key={`${signal.label}-${signal.value}`} className="dashboard-hero__signal-card">
                <span className="dashboard-hero__signal-label">{signal.label}</span>
                <span className="dashboard-hero__signal-value">{signal.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
export const DashboardModeSwitch = ({
  value,
  onChange,
  title = "Control lanes",
  subtitle = "Switch between immediate work, analytics, and deeper operating context without leaving the current role."
}: {
  value: DashboardView;
  onChange: (value: DashboardView) => void;
  title?: string;
  subtitle?: string;
}) => {
  return (
    <div className="dashboard-mode-switch rounded-[24px] border border-slate-200/80 bg-white/90 shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <div className="dashboard-mode-switch__copy min-w-0">
        <p className="dashboard-mode-switch__title">{title}</p>
        <p className="dashboard-mode-switch__subtitle">{subtitle}</p>
      </div>
      <div className="dashboard-mode-switch__tabs min-w-0">
        <Tabs
          tabs={DASHBOARD_VIEW_OPTIONS}
          active={value}
          onChange={(next) => onChange((next as DashboardView) ?? "workspace")}
          noWrap
          variant="soft"
        />
      </div>
    </div>
  );
};

export const DashboardScaffold = ({
  eyebrow,
  title,
  subtitle,
  actions,
  emphasis = "default",
  value,
  onViewChange,
  modeTitle = "Workspace lenses",
  modeSubtitle = "Move between overview, analytics, and operations without losing context.",
  heroSignals,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  emphasis?: "default" | "executive" | "operations";
  value: DashboardView;
  onViewChange: (value: DashboardView) => void;
  modeTitle?: string;
  modeSubtitle?: string;
  heroSignals?: Array<{ label: string; value: string }>;
  children: ReactNode;
}) => {
  return (
    <div className="dashboard-page page-wrap space-y-8 fade-in">
      <div className="dashboard-page__masthead">
        <DashboardHero eyebrow={eyebrow} title={title} subtitle={subtitle} actions={actions} emphasis={emphasis} signals={heroSignals} />
        <DashboardModeSwitch value={value} onChange={onViewChange} title={modeTitle} subtitle={modeSubtitle} />
      </div>
      <div className="dashboard-page__body space-y-8">{children}</div>
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
  actions: Array<{ label: string; href: string; caption?: string; icon?: LucideIcon }>;
}) => {
  return (
    <div className="dashboard-quick-grid">
      {actions.map((action) => (
        <ActionCard
          key={`${action.href}-${action.label}`}
          href={action.href}
          title={action.label}
          description={action.caption}
          icon={action.icon ?? resolveQuickActionIcon(action.href, action.label)}
        />
      ))}
    </div>
  );
};

export const DashboardModuleDeck = ({
  modules
}: {
  modules: Array<{
    title: string;
    description: string;
    href: string;
    label?: string;
    highlights?: string[];
    metric?: string;
    icon?: LucideIcon;
  }>;
}) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((module) => {
        const Icon = module.icon ?? resolveQuickActionIcon(module.href, module.title);

        return (
          <Link
            key={`${module.href}-${module.title}`}
            href={module.href}
            className="group rounded-[24px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_40px_rgba(14,116,144,0.12)] dark:border-slate-800 dark:bg-slate-950/78 dark:hover:border-sky-500/30"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  {module.label ? (
                    <span className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300">
                      {module.label}
                    </span>
                  ) : null}
                  <div>
                    <p className="text-base font-semibold tracking-[-0.02em] text-slate-950 dark:text-slate-50">{module.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">{module.description}</p>
                  </div>
                </div>
              </div>
              {module.metric ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {module.metric}
                </span>
              ) : null}
            </div>

            {module.highlights?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {module.highlights.map((highlight) => (
                  <span
                    key={`${module.href}-${highlight}`}
                    className="inline-flex rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-sky-700 transition group-hover:text-sky-800 dark:text-sky-300 dark:group-hover:text-sky-200">
              Open module
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        );
      })}
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

const resolveQuickActionIcon = (href: string, label: string): LucideIcon => {
  const fingerprint = `${href} ${label}`.toLowerCase();

  if (fingerprint.includes("monitor")) return ShieldCheck;
  if (fingerprint.includes("billing") || fingerprint.includes("invoice")) return ReceiptText;
  if (fingerprint.includes("payroll")) return WalletCards;
  if (fingerprint.includes("payslip")) return ScrollText;
  if (fingerprint.includes("approval")) return BadgeCheck;
  if (fingerprint.includes("people") || fingerprint.includes("employee")) return Users;
  if (fingerprint.includes("profile")) return UserRound;
  if (fingerprint.includes("organiz") || fingerprint.includes("org chart")) return Network;
  if (fingerprint.includes("project")) return BriefcaseBusiness;
  if (fingerprint.includes("attendance")) return Clock3;
  if (fingerprint.includes("leave")) return CalendarRange;
  if (fingerprint.includes("shift")) return CalendarClock;
  if (fingerprint.includes("calendar")) return CalendarDays;
  if (fingerprint.includes("loan") || fingerprint.includes("advance")) return HandCoins;
  if (fingerprint.includes("chat") || fingerprint.includes("message")) return MessageSquare;
  if (fingerprint.includes("notification")) return BellDot;
  if (fingerprint.includes("resource") || fingerprint.includes("knowledge") || fingerprint.includes("sop")) return BookOpenText;
  if (fingerprint.includes("analytics") || fingerprint.includes("trend")) return ChartColumnBig;
  if (fingerprint.includes("setting")) return Settings2;
  if (fingerprint.includes("swap") || fingerprint.includes("change")) return RefreshCw;
  return LayoutGrid;
};


