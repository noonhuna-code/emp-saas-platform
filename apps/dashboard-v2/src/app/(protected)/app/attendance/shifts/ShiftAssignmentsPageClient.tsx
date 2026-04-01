"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assignBreak,
  removeBreakAssignment,
  removeShiftAssignment,
  fetchBreakAssignments,
  assignShift,
  fetchShiftAssignableEmployees,
  fetchShiftAssignments,
  fetchShiftTemplates,
  updateBreakAssignment,
  updateShiftAssignment
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
  const [shiftEffectiveFrom, setShiftEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [shiftEffectiveTo, setShiftEffectiveTo] = useState("");
  const [editingShiftAssignmentId, setEditingShiftAssignmentId] = useState<string | null>(null);
  const [breakName, setBreakName] = useState("Break 1");
  const [breakStartTime, setBreakStartTime] = useState("13:00");
  const [breakEndTime, setBreakEndTime] = useState("14:00");
  const [breakEffectiveFrom, setBreakEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [breakEffectiveTo, setBreakEffectiveTo] = useState("");
  const [editingBreakAssignmentId, setEditingBreakAssignmentId] = useState<string | null>(null);
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

  const loadAssignments = useCallback(async (selectedEmployeeId?: string) => {
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
  }, [employeeId]);

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
  }, [employeeId, loadAssignments]);

  const resetShiftForm = useCallback(() => {
    setEditingShiftAssignmentId(null);
    setShiftEffectiveFrom(new Date().toISOString().slice(0, 10));
    setShiftEffectiveTo("");
    setMessage(null);
  }, []);

  const resetBreakForm = useCallback(() => {
    setEditingBreakAssignmentId(null);
    setBreakName("Break 1");
    setBreakStartTime("13:00");
    setBreakEndTime("14:00");
    setBreakEffectiveFrom(new Date().toISOString().slice(0, 10));
    setBreakEffectiveTo("");
    setMessage(null);
  }, []);

  const templateOptions = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );

  const onAssign = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = editingShiftAssignmentId
      ? await updateShiftAssignment(editingShiftAssignmentId, {
          shiftTemplateId,
          effectiveFrom: shiftEffectiveFrom,
          effectiveTo: shiftEffectiveTo || null
        })
      : await assignShift({
          employeeId,
          shiftTemplateId,
          effectiveFrom: shiftEffectiveFrom,
          effectiveTo: shiftEffectiveTo || null
        });

    if (!result.ok) {
      setError(result.error ?? (editingShiftAssignmentId ? "Unable to update shift" : "Unable to assign shift"));
      return;
    }

    setMessage(editingShiftAssignmentId ? "Shift updated successfully." : "Shift assigned successfully.");
    resetShiftForm();
    await loadAssignments(employeeId);
  };

  const onAssignBreak = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = editingBreakAssignmentId
      ? await updateBreakAssignment(editingBreakAssignmentId, {
          breakName,
          breakStartTime,
          breakEndTime,
          effectiveFrom: breakEffectiveFrom,
          effectiveTo: breakEffectiveTo || null
        })
      : await assignBreak({
          employeeId,
          breakName,
          breakStartTime,
          breakEndTime,
          effectiveFrom: breakEffectiveFrom,
          effectiveTo: breakEffectiveTo || null
        });

    if (!result.ok) {
      setError(result.error ?? (editingBreakAssignmentId ? "Unable to update break" : "Unable to assign break"));
      return;
    }

    setMessage(editingBreakAssignmentId ? "Break updated successfully." : "Break assigned successfully.");
    resetBreakForm();
    await loadAssignments(employeeId);
  };

  const applyShiftRangePreset = (days: number) => {
    if (!shiftEffectiveFrom) return;
    setShiftEffectiveTo(addDays(shiftEffectiveFrom, Math.max(0, days - 1)));
  };

  const applyBreakRangePreset = (days: number) => {
    if (!breakEffectiveFrom) return;
    setBreakEffectiveTo(addDays(breakEffectiveFrom, Math.max(0, days - 1)));
  };

  const startEditingShift = (assignment: ShiftAssignment) => {
    setEditingShiftAssignmentId(assignment.id);
    setShiftTemplateId(assignment.shift_template_id);
    setShiftEffectiveFrom(assignment.effective_from);
    setShiftEffectiveTo(assignment.effective_to ?? "");
    setError(null);
    setMessage(null);
  };

  const startEditingBreak = (assignment: BreakAssignment) => {
    setEditingBreakAssignmentId(assignment.id);
    setBreakName(assignment.break_name ?? "Assigned break");
    setBreakStartTime(assignment.break_start_time.slice(0, 5));
    setBreakEndTime(assignment.break_end_time.slice(0, 5));
    setBreakEffectiveFrom(assignment.effective_from);
    setBreakEffectiveTo(assignment.effective_to ?? "");
    setError(null);
    setMessage(null);
  };

  const onRemoveShift = async (assignmentId: string) => {
    if (!window.confirm("Remove this shift assignment?")) return;
    setError(null);
    setMessage(null);
    const result = await removeShiftAssignment(assignmentId);
    if (!result.ok) {
      setError(result.error ?? "Unable to remove shift assignment");
      return;
    }
    if (editingShiftAssignmentId === assignmentId) {
      resetShiftForm();
    }
    setMessage("Shift assignment removed.");
    await loadAssignments(employeeId);
  };

  const onRemoveBreak = async (assignmentId: string) => {
    if (!window.confirm("Remove this break assignment?")) return;
    setError(null);
    setMessage(null);
    const result = await removeBreakAssignment(assignmentId);
    if (!result.ok) {
      setError(result.error ?? "Unable to remove break assignment");
      return;
    }
    if (editingBreakAssignmentId === assignmentId) {
      resetBreakForm();
    }
    setMessage("Break assignment removed.");
    await loadAssignments(employeeId);
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
            <input type="date" required value={shiftEffectiveFrom} onChange={(event) => setShiftEffectiveFrom(event.target.value)} />
          </label>
          <label>
            Effective to (optional)
            <input type="date" value={shiftEffectiveTo} onChange={(event) => setShiftEffectiveTo(event.target.value)} />
          </label>
          <div className="stack" style={{ justifyContent: "end" }}>
            <span className="muted">Range presets</span>
            <div className="row">
              <button type="button" className="secondary-btn" onClick={() => applyShiftRangePreset(1)}>1 day</button>
              <button type="button" className="secondary-btn" onClick={() => applyShiftRangePreset(7)}>7 days</button>
              <button type="button" className="secondary-btn" onClick={() => applyShiftRangePreset(30)}>30 days</button>
              <button type="button" className="secondary-btn" onClick={() => setShiftEffectiveTo("")}>Custom</button>
            </div>
          </div>
          <div className="row" style={{ alignItems: "end" }}>
            <button type="submit" className="primary-btn">{editingShiftAssignmentId ? "Save shift" : "Assign"}</button>
            {editingShiftAssignmentId ? (
              <button type="button" className="secondary-btn" onClick={resetShiftForm}>Cancel edit</button>
            ) : null}
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
          <label>
            Effective from
            <input type="date" required value={breakEffectiveFrom} onChange={(event) => setBreakEffectiveFrom(event.target.value)} />
          </label>
          <label>
            Effective to (optional)
            <input type="date" value={breakEffectiveTo} onChange={(event) => setBreakEffectiveTo(event.target.value)} />
          </label>
          <div className="stack" style={{ justifyContent: "end" }}>
            <span className="muted">Range presets</span>
            <div className="row">
              <button type="button" className="secondary-btn" onClick={() => applyBreakRangePreset(1)}>1 day</button>
              <button type="button" className="secondary-btn" onClick={() => applyBreakRangePreset(7)}>7 days</button>
              <button type="button" className="secondary-btn" onClick={() => applyBreakRangePreset(30)}>30 days</button>
              <button type="button" className="secondary-btn" onClick={() => setBreakEffectiveTo("")}>Custom</button>
            </div>
          </div>
          <div className="row" style={{ alignItems: "end" }}>
            <button type="submit" className="primary-btn">{editingBreakAssignmentId ? "Save break" : "Assign break"}</button>
            {editingBreakAssignmentId ? (
              <button type="button" className="secondary-btn" onClick={resetBreakForm}>Cancel edit</button>
            ) : null}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((row) => (
                <tr key={row.id}>
                  <td>{row.id.slice(0, 8)}...</td>
                  <td>{templateOptions.get(row.shift_template_id)?.name ?? row.shift_template_id}</td>
                  <td>{row.effective_from}</td>
                  <td>{row.effective_to ?? "-"}</td>
                  <td>{new Date(row.created_at).toLocaleString()}</td>
                  <td>
                    <div className="row">
                      <button type="button" className="secondary-btn" onClick={() => startEditingShift(row)}>Edit</button>
                      <button type="button" className="secondary-btn" onClick={() => void onRemoveShift(row.id)}>Remove</button>
                    </div>
                  </td>
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
                <th>Actions</th>
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
                  <td>
                    <div className="row">
                      <button type="button" className="secondary-btn" onClick={() => startEditingBreak(row)}>Edit</button>
                      <button type="button" className="secondary-btn" onClick={() => void onRemoveBreak(row.id)}>Remove</button>
                    </div>
                  </td>
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
