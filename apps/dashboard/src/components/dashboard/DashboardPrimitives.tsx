"use client";

import type { ReactNode } from "react";
import Link from "next/link";

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
  return (
    <div className={`dashboard-kpi dashboard-kpi--${accent}`}>
      <div className="dashboard-kpi__header">
        <span className="dashboard-kpi__label">{label}</span>
        {trend ? <span className="dashboard-kpi__trend">{trend}</span> : null}
      </div>
      <strong className="dashboard-kpi__value">{value}</strong>
      {hint ? <span className="dashboard-kpi__hint">{hint}</span> : null}
      {footer ? <div className="dashboard-kpi__footer">{footer}</div> : null}
    </div>
  );
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
    <section className={`card dashboard-panel dashboard-panel--${tone}`}>
      <div className="dashboard-panel__header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="dashboard-panel__actions">{actions}</div> : null}
      </div>
      <div className="dashboard-panel__body">{children}</div>
    </section>
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
        <Link key={`${action.href}-${action.label}`} href={action.href} className="quick-action-tile">
          <span className="quick-action-tile__label">{action.label}</span>
          {action.caption ? <span className="quick-action-tile__caption">{action.caption}</span> : null}
        </Link>
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
