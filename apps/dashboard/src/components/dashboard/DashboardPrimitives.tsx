"use client";

import type { ReactNode } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { ActionCard } from "@/components/ui/ActionCard";

export const DashboardHero = ({
  eyebrow,
  title,
  subtitle,
  actions,
  emphasis
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
  emphasis?: "default" | "executive" | "operations";
}) => {
  return (
    <section className={`dashboard-hero dashboard-hero--${emphasis ?? "default"}`}>
      <div className="dashboard-hero__content">
        {eyebrow ? <span className="dashboard-hero__eyebrow">{eyebrow}</span> : null}
        <h1 className="dashboard-hero__title">{title}</h1>
        <p className="dashboard-hero__subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="dashboard-hero__actions">{actions}</div> : null}
    </section>
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

export const QuickActionGrid = ({
  actions
}: {
  actions: Array<{ label: string; href: string; caption?: string }>;
}) => {
  return (
    <div className="quick-action-grid">
      {actions.map((action) => (
        <ActionCard key={`${action.href}-${action.label}`} href={action.href} title={action.label} subtitle={action.caption} />
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
    <div className={`signal-row signal-row--${tone}`}>
      <span className="signal-row__label">{label}</span>
      <span className="signal-row__value">{value}</span>
    </div>
  );
};

export const TimelineList = ({
  items
}: {
  items: Array<{ title: string; subtitle?: string; meta?: string }>;
}) => {
  return (
    <div className="dashboard-timeline">
      {items.map((item, index) => (
        <div className="dashboard-timeline__item" key={`${item.title}-${item.meta ?? ""}-${index}`}>
          <div className="dashboard-timeline__dot" aria-hidden="true" />
          <div className="dashboard-timeline__content">
            <strong>{item.title}</strong>
            {item.subtitle ? <span className="muted">{item.subtitle}</span> : null}
          </div>
          {item.meta ? <span className="dashboard-timeline__meta">{item.meta}</span> : null}
        </div>
      ))}
    </div>
  );
};
