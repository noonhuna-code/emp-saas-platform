"use client";

import type { PayrollLifecycleState, PayrollRunTimelineResponse } from "@/lib/types/payroll";
import { StatusBadge } from "@/components/shared/StatusBadge";

const STEPS: PayrollLifecycleState[] = [
  "DRAFT",
  "PROCESSING",
  "CALCULATED",
  "FINALIZED",
  "LOCKED",
  "PAID",
  "ARCHIVED"
];

const stepStateSet = (currentState: PayrollLifecycleState): Set<PayrollLifecycleState> => {
  const idx = STEPS.indexOf(currentState);
  return new Set(idx >= 0 ? STEPS.slice(0, idx + 1) : []);
};

const lifecycleRows = (data: PayrollRunTimelineResponse) => [
  { label: "Created", value: data.lifecycle.createdAt },
  { label: "Calculated", value: data.lifecycle.calculatedAt ?? null },
  { label: "Finalized", value: data.lifecycle.finalizedAt ?? null },
  { label: "Locked", value: data.lifecycle.lockedAt ?? null },
  { label: "Paid", value: data.lifecycle.paidAt ?? null }
];

export const PayrollRunTimelineView = ({ data }: { data: PayrollRunTimelineResponse }) => {
  const completed = stepStateSet(data.currentState);

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0 }}>Lifecycle Timeline</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Read-only state machine interpretation for payroll run <code>{data.runId}</code>
            </p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <StatusBadge status={data.currentState.toLowerCase()} />
            <StatusBadge
              status={data.stateMetadata.isLocked ? "locked" : "unlocked"}
              tone={data.stateMetadata.isLocked ? "success" : "warning"}
            />
          </div>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h3>Lifecycle Progression</h3>
          <p className="muted">Read-only visualization of interpreted payroll lifecycle states.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {STEPS.map((step) => {
            const done = completed.has(step);
            const active = data.currentState === step;
            return (
              <div
                key={step}
                className={`badge ${active ? "badge--info" : done ? "badge--green" : ""}`}
                aria-current={active ? "step" : undefined}
              >
                {step}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card stack">
        <div>
          <h3>State Metadata</h3>
          <p className="muted">Capability-safe lifecycle interpretation used by payroll read surfaces.</p>
        </div>
        <div className="form-grid form-grid--two">
          <div className="card card--nested stack">
            <span className="muted">Current State</span>
            <strong>{data.stateMetadata.currentState}</strong>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Financial Commitment</span>
            <strong>{data.stateMetadata.isFinanciallyCommitted ? "Committed" : "Not committed"}</strong>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Mutable</span>
            <strong>{data.stateMetadata.isMutable ? "Yes" : "No"}</strong>
          </div>
          <div className="card card--nested stack">
            <span className="muted">Visible to Employees</span>
            <strong>{data.stateMetadata.isVisibleToEmployees ? "Yes" : "No"}</strong>
          </div>
        </div>
      </section>

      <section className="card stack">
        <div>
          <h3>Lifecycle Timestamps</h3>
          <p className="muted">Derived from persisted payroll run timestamps (read-only).</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Stage</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {lifecycleRows(data).map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>{row.value ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card stack">
        <div>
          <h3>Actor History</h3>
          <p className="muted">Minimal audit surface derived from payroll run actor/timestamp fields.</p>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Performed By</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {data.actorHistory.length > 0 ? data.actorHistory.map((row, index) => (
              <tr key={`${row.action}-${row.timestamp}-${index}`}>
                <td>{row.action}</td>
                <td>{row.performedBy ?? "System / Unknown"}</td>
                <td>{row.timestamp}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={3}>No actor history available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
};
