"use client";

import { useEffect, useState } from "react";
import {
  assignBreak,
  fetchBreakAssignments,
  assignShift,
  fetchShiftAssignableEmployees,
  fetchShiftAssignments,
  fetchShiftTemplates
} from "@/lib/client/api";
import type { BreakAssignment, ShiftAssignableEmployee, ShiftAssignment, ShiftTemplate } from "@/lib/types/workspace";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

const addDays = (dateText: string, days: number) => {
  const base = new Date(`${dateText}T00:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
};

const ShiftAssignmentsPageClient = () => {
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [employees, setEmployees] = useState<ShiftAssignableEmployee[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [breakAssignments, setBreakAssignments] = useState<BreakAssignment[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [shiftTemplateId, setShiftTemplateId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState("");
  const [breakName, setBreakName] = useState("Break 1");
  const [breakStartTime, setBreakStartTime] = useState("13:00");
  const [breakEndTime, setBreakEndTime] = useState("14:00");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadTemplates = async () => {
    const [templatesResult, employeesResult] = await Promise.all([
      fetchShiftTemplates(),
      fetchShiftAssignableEmployees(300)
    ]);

    if (!templatesResult.ok || !templatesResult.data) {
      setError(templatesResult.error ?? "Unable to load shift templates");
      return;
    }
    if (!employeesResult.ok || !employeesResult.data) {
      setError(employeesResult.error ?? "Unable to load assignable employees");
      return;
    }

    setTemplates(templatesResult.data.rows);
    setEmployees(employeesResult.data.rows);
    setShiftTemplateId((prev) => prev || templatesResult.data?.rows?.[0]?.id || "");
    setEmployeeId((prev) => prev || employeesResult.data?.rows?.[0]?.id || "");
  };

  const loadAssignments = async (selectedEmployeeId?: string) => {
    const resolved = (selectedEmployeeId ?? employeeId).trim();
    if (!resolved) {
      setAssignments([]);
      setBreakAssignments([]);
      return;
    }

    const [shiftResult, breakResult] = await Promise.all([
      fetchShiftAssignments({ employeeId: resolved, limit: 20 }),
      fetchBreakAssignments({ employeeId: resolved, limit: 30 }),
    ]);

    if (!shiftResult.ok || !shiftResult.data) {
      setError(shiftResult.error ?? "Unable to load assignments");
      return;
    }
    if (!breakResult.ok || !breakResult.data) {
      setError(breakResult.error ?? "Unable to load break assignments");
      return;
    }
    setAssignments(shiftResult.data.rows);
    setBreakAssignments(breakResult.data.rows);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void loadTemplates().finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!employeeId) return;
    void loadAssignments(employeeId);
  }, [employeeId]);

  const onAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = await assignShift({
      employeeId,
      shiftTemplateId,
      effectiveFrom,
      effectiveTo: effectiveTo || null
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to assign shift");
      return;
    }

    setMessage("Shift assigned successfully.");
    await loadAssignments(employeeId);
  };

  const onAssignBreak = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = await assignBreak({
      employeeId,
      breakName,
      breakStartTime,
      breakEndTime,
      effectiveFrom,
      effectiveTo: effectiveTo || null
    });

    if (!result.ok) {
      setError(result.error ?? "Unable to assign break");
      return;
    }

    setMessage("Break assigned successfully.");
    await loadAssignments(employeeId);
  };

  const applyRangePreset = (days: number) => {
    if (!effectiveFrom) return;
    setEffectiveTo(addDays(effectiveFrom, Math.max(0, days - 1)));
  };

  return (
    <div className="page-wrap page-grid">
      <section className="card stack">
        <h1>Shift Assignment</h1>
        <p className="muted">Team leads, supervisors, HR, and admin roles can assign shifts within their scoped employee hierarchy.</p>
      </section>

      {loading ? <LoadingState label="Loading shift module..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      <section className="card stack">
        <h3>Assign shift</h3>
        <form className="form-grid form-grid--three" onSubmit={onAssign}>
          <label>
            Employee
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {(employee.full_name ?? employee.employee_code ?? employee.id)}{employee.is_direct_report ? " (direct report)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Shift template
            <select value={shiftTemplateId} onChange={(event) => setShiftTemplateId(event.target.value)} required>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.start_time}-{template.end_time})
                </option>
              ))}
            </select>
          </label>
          <label>
            Effective from
            <input type="date" required value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
          </label>
          <label>
            Effective to (optional)
            <input type="date" value={effectiveTo} onChange={(event) => setEffectiveTo(event.target.value)} />
          </label>
          <div className="stack" style={{ justifyContent: "end" }}>
            <span className="muted">Range presets</span>
            <div className="row">
              <button type="button" className="secondary-btn" onClick={() => applyRangePreset(1)}>1 day</button>
              <button type="button" className="secondary-btn" onClick={() => applyRangePreset(7)}>7 days</button>
              <button type="button" className="secondary-btn" onClick={() => applyRangePreset(30)}>30 days</button>
              <button type="button" className="secondary-btn" onClick={() => setEffectiveTo("")}>Custom</button>
            </div>
          </div>
          <div className="row" style={{ alignItems: "end" }}>
            <button type="submit" className="primary-btn">Assign</button>
            <button type="button" className="secondary-btn" onClick={() => void loadAssignments()}>Load assignments</button>
          </div>
        </form>
        {message ? <p>{message}</p> : null}
      </section>

      <section className="card stack">
        <h3>Assign break</h3>
        <p className="muted">Assign one or more break windows to the selected agent using real effective dates and exact times.</p>
        <form className="form-grid form-grid--three" onSubmit={onAssignBreak}>
          <label>
            Break name
            <input type="text" value={breakName} onChange={(event) => setBreakName(event.target.value)} placeholder="Break 1 / Lunch / Break 2" />
          </label>
          <label>
            Break start
            <input type="time" required value={breakStartTime} onChange={(event) => setBreakStartTime(event.target.value)} />
          </label>
          <label>
            Break end
            <input type="time" required value={breakEndTime} onChange={(event) => setBreakEndTime(event.target.value)} />
          </label>
          <div className="row" style={{ alignItems: "end" }}>
            <button type="submit" className="primary-btn">Assign break</button>
          </div>
        </form>
      </section>

      <section className="card stack">
        <h3>Assignable employees</h3>
        {employees.length === 0 ? <p className="muted">No employees available in your assignment scope.</p> : null}
        {employees.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Code</th>
                  <th>Designation</th>
                  <th>Department / Team</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.full_name ?? "-"}</td>
                    <td>{employee.employee_code ?? "-"}</td>
                    <td>{employee.designation ?? "-"}</td>
                    <td>{employee.department_name ?? "-"} / {employee.team_name ?? "-"}</td>
                    <td>{employee.is_direct_report ? "Direct report" : "Self / scoped"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card stack">
        <h3>Assignments</h3>
        {assignments.length === 0 ? <p className="muted">No assignments loaded.</p> : null}
        {assignments.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Shift Template</th>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.id.slice(0, 8)}...</td>
                  <td>{row.shift_template_id}</td>
                  <td>{row.effective_from}</td>
                  <td>{row.effective_to ?? "-"}</td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>

      <section className="card stack">
        <h3>Assigned breaks</h3>
        {breakAssignments.length === 0 ? <p className="muted">No break assignments loaded.</p> : null}
        {breakAssignments.length > 0 ? (
          <table className="table">
            <thead>
              <tr>
                <th>Break</th>
                <th>Start</th>
                <th>End</th>
                <th>Effective From</th>
                <th>Effective To</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {breakAssignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.break_name ?? "Assigned break"}</td>
                  <td>{row.break_start_time}</td>
                  <td>{row.break_end_time}</td>
                  <td>{row.effective_from}</td>
                  <td>{row.effective_to ?? "-"}</td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </section>
    </div>
  );
};

export default ShiftAssignmentsPageClient;
