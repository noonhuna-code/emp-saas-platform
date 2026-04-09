"use client";

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  assignBreak,
  assignShift,
  fetchBreakAssignments,
  fetchShiftAssignableEmployees,
  fetchShiftAssignments,
  fetchShiftTemplates,
  removeBreakAssignment,
  removeShiftAssignment,
  updateBreakAssignment,
  updateShiftAssignment,
} from "@/lib/client/api";
import type {
  BreakAssignment,
  ShiftAssignableEmployee,
  ShiftAssignment,
  ShiftTemplate,
} from "@/lib/types/workspace";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DashboardRail,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import {
  ProfileTableShell,
  ProfileTableToolbar,
  profileFieldClassName,
} from "@/components/profile/ProfileSectionPrimitives";

const addDays = (dateText: string, days: number) => {
  const base = new Date(`${dateText}T00:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
};

const cardFieldLabelClassName = "text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500";
const cardFieldValueClassName = "text-sm font-medium text-slate-900";

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
  const [employeeQuery, setEmployeeQuery] = useState("");

  const loadTemplates = async () => {
    const [templatesResult, employeesResult] = await Promise.all([
      fetchShiftTemplates(),
      fetchShiftAssignableEmployees(300),
    ]);

    if (!templatesResult.ok || !templatesResult.data) {
      setError(templatesResult.error ?? "Unable to load shift templates");
      return;
    }
    if (!employeesResult.ok || !employeesResult.data) {
      setError(employeesResult.error ?? "Unable to load assignable employees");
      return;
    }

    const templateRows = templatesResult.data.rows;
    const employeeRows = employeesResult.data.rows;

    setTemplates(templateRows);
    setEmployees(employeeRows);
    setShiftTemplateId((prev) => prev || templateRows[0]?.id || "");
    setEmployeeId((prev) => prev || employeeRows[0]?.id || "");
  };

  const loadAssignments = useCallback(
    async (selectedEmployeeId?: string) => {
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
    },
    [employeeId],
  );

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
    [templates],
  );

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === employeeId) ?? null,
    [employeeId, employees],
  );

  const filteredEmployees = useMemo(() => {
    const normalized = employeeQuery.trim().toLowerCase();
    if (!normalized) return employees;
    return employees.filter((employee) =>
      [
        employee.full_name,
        employee.employee_code,
        employee.designation,
        employee.department_name,
        employee.team_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [employeeQuery, employees]);

  const onAssign = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = editingShiftAssignmentId
      ? await updateShiftAssignment(editingShiftAssignmentId, {
          shiftTemplateId,
          effectiveFrom: shiftEffectiveFrom,
          effectiveTo: shiftEffectiveTo || null,
        })
      : await assignShift({
          employeeId,
          shiftTemplateId,
          effectiveFrom: shiftEffectiveFrom,
          effectiveTo: shiftEffectiveTo || null,
        });

    if (!result.ok) {
      setError(result.error ?? (editingShiftAssignmentId ? "Unable to update shift" : "Unable to assign shift"));
      return;
    }

    setMessage(editingShiftAssignmentId ? "Shift updated successfully." : "Shift assigned successfully.");
    resetShiftForm();
    await loadAssignments(employeeId);
  };

  const onAssignBreak = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const result = editingBreakAssignmentId
      ? await updateBreakAssignment(editingBreakAssignmentId, {
          breakName,
          breakStartTime,
          breakEndTime,
          effectiveFrom: breakEffectiveFrom,
          effectiveTo: breakEffectiveTo || null,
        })
      : await assignBreak({
          employeeId,
          breakName,
          breakStartTime,
          breakEndTime,
          effectiveFrom: breakEffectiveFrom,
          effectiveTo: breakEffectiveTo || null,
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
    if (editingShiftAssignmentId === assignmentId) resetShiftForm();
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
    if (editingBreakAssignmentId === assignmentId) resetBreakForm();
    setMessage("Break assignment removed.");
    await loadAssignments(employeeId);
  };

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Operations"
        title="Shift assignments"
        description="Assign schedules, update effective ranges, and keep break coverage clean for your scoped employee hierarchy."
        chips={["Team lead / HR / admin scope", "Live assignment workspace"]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="rounded-full" onClick={() => void loadAssignments()}>
              Refresh assignments
            </Button>
            <Link href="/app/attendance/team" className={buttonVariants({ variant: "secondary", className: "rounded-full" })}>
              Team attendance
            </Link>
            <Link href="/app/attendance/shift-swaps" className={buttonVariants({ variant: "secondary", className: "rounded-full" })}>
              Shift changes
            </Link>
          </div>
        }
      />

      {loading ? <LoadingState label="Loading shift and break workspace..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading ? (
        <>
          <StatGrid>
            <StatCard label="Shift templates" value={templates.length} hint="Live templates available for assignment" />
            <StatCard label="Assignable employees" value={employees.length} hint="Employees in your assignment scope" />
            <StatCard label="Loaded shifts" value={assignments.length} hint={selectedEmployee ? "Current employee assignments" : "Select an employee to load"} />
            <StatCard label="Loaded breaks" value={breakAssignments.length} hint={selectedEmployee ? "Current employee break windows" : "Select an employee to load"} />
          </StatGrid>

          <DashboardRail className="items-start">
            <SurfacePanel
              title={editingShiftAssignmentId ? "Edit shift assignment" : "Assign shift"}
              description="Choose the employee, template, and date range to create or update the working shift window."
              actions={
                selectedEmployee ? (
                  <Badge className="rounded-full border-slate-200 bg-slate-50 text-slate-700">
                    {selectedEmployee.full_name ?? selectedEmployee.employee_code ?? "Selected employee"}
                  </Badge>
                ) : null
              }
            >
              <form className="grid gap-4 xl:grid-cols-2" onSubmit={onAssign}>
                <label className="grid gap-1.5 text-sm">
                  Employee
                  <select
                    className={profileFieldClassName}
                    value={employeeId}
                    onChange={(event) => setEmployeeId(event.target.value)}
                    required
                  >
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {(employee.full_name ?? employee.employee_code ?? employee.id)}
                        {employee.is_direct_report ? " (direct report)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm">
                  Shift template
                  <select
                    className={profileFieldClassName}
                    value={shiftTemplateId}
                    onChange={(event) => setShiftTemplateId(event.target.value)}
                    required
                  >
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name} ({template.start_time}-{template.end_time})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm">
                  Effective from
                  <input
                    className={profileFieldClassName}
                    type="date"
                    required
                    value={shiftEffectiveFrom}
                    onChange={(event) => setShiftEffectiveFrom(event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Effective to
                  <input
                    className={profileFieldClassName}
                    type="date"
                    value={shiftEffectiveTo}
                    onChange={(event) => setShiftEffectiveTo(event.target.value)}
                  />
                </label>
                <div className="xl:col-span-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    Range presets
                  </span>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => applyShiftRangePreset(1)}>
                    1 day
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => applyShiftRangePreset(7)}>
                    7 days
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => applyShiftRangePreset(30)}>
                    30 days
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => setShiftEffectiveTo("")}>
                    Custom
                  </Button>
                </div>
                <div className="xl:col-span-2 flex flex-wrap items-center gap-2">
                  <Button type="submit" className="rounded-full px-5">
                    {editingShiftAssignmentId ? "Save shift" : "Assign shift"}
                  </Button>
                  {editingShiftAssignmentId ? (
                    <Button type="button" variant="secondary" className="rounded-full" onClick={resetShiftForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </SurfacePanel>

            <SurfacePanel
              title={editingBreakAssignmentId ? "Edit break assignment" : "Assign break"}
              description="Attach one break window at a time with exact timing and a clean effective range."
            >
              <form className="grid gap-4 xl:grid-cols-2" onSubmit={onAssignBreak}>
                <label className="grid gap-1.5 text-sm">
                  Break name
                  <input
                    className={profileFieldClassName}
                    type="text"
                    value={breakName}
                    onChange={(event) => setBreakName(event.target.value)}
                    placeholder="Break 1 / Lunch / Break 2"
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Break start
                  <input
                    className={profileFieldClassName}
                    type="time"
                    required
                    value={breakStartTime}
                    onChange={(event) => setBreakStartTime(event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Break end
                  <input
                    className={profileFieldClassName}
                    type="time"
                    required
                    value={breakEndTime}
                    onChange={(event) => setBreakEndTime(event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Effective from
                  <input
                    className={profileFieldClassName}
                    type="date"
                    required
                    value={breakEffectiveFrom}
                    onChange={(event) => setBreakEffectiveFrom(event.target.value)}
                  />
                </label>
                <label className="grid gap-1.5 text-sm">
                  Effective to
                  <input
                    className={profileFieldClassName}
                    type="date"
                    value={breakEffectiveTo}
                    onChange={(event) => setBreakEffectiveTo(event.target.value)}
                  />
                </label>
                <div className="xl:col-span-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    Range presets
                  </span>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => applyBreakRangePreset(1)}>
                    1 day
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => applyBreakRangePreset(7)}>
                    7 days
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => applyBreakRangePreset(30)}>
                    30 days
                  </Button>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => setBreakEffectiveTo("")}>
                    Custom
                  </Button>
                </div>
                <div className="xl:col-span-2 flex flex-wrap items-center gap-2">
                  <Button type="submit" className="rounded-full px-5">
                    {editingBreakAssignmentId ? "Save break" : "Assign break"}
                  </Button>
                  {editingBreakAssignmentId ? (
                    <Button type="button" variant="secondary" className="rounded-full" onClick={resetBreakForm}>
                      Cancel edit
                    </Button>
                  ) : null}
                </div>
              </form>
            </SurfacePanel>
          </DashboardRail>

          {message ? (
            <div className="rounded-[20px] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-700">
              {message}
            </div>
          ) : null}

          <SurfacePanel
            title="Assignable employees"
            description="Review the scoped employee list before assigning shifts or breaks."
            actions={
              <div className="w-full min-w-0 sm:w-auto">
                <ProfileTableToolbar
                  query={employeeQuery}
                  onQueryChange={setEmployeeQuery}
                  placeholder="Search employee, code, team, or designation"
                  countLabel={`${filteredEmployees.length} employees`}
                />
              </div>
            }
          >
            {filteredEmployees.length === 0 ? (
              <EmptyState title="No assignable employees" subtitle="No employees are available inside your assignment scope right now." compact />
            ) : (
              <>
                <div className="grid gap-3 lg:hidden">
                  {filteredEmployees.map((employee) => (
                    <div key={employee.id} className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                      <div className="space-y-1">
                        <p className="truncate text-base font-semibold text-slate-950">{employee.full_name ?? "-"}</p>
                        <p className="truncate text-xs text-slate-500">{employee.employee_code ?? "-"}</p>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm">
                        <div>
                          <p className={cardFieldLabelClassName}>Designation</p>
                          <p className={cardFieldValueClassName}>{employee.designation ?? "-"}</p>
                        </div>
                        <div>
                          <p className={cardFieldLabelClassName}>Department / team</p>
                          <p className={cardFieldValueClassName}>{employee.department_name ?? "-"} / {employee.team_name ?? "-"}</p>
                        </div>
                        <div>
                          <p className={cardFieldLabelClassName}>Scope</p>
                          <p className={cardFieldValueClassName}>{employee.is_direct_report ? "Direct report" : "Self / scoped"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden lg:block">
                  <ProfileTableShell>
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Code</th>
                          <th className="px-4 py-3">Designation</th>
                          <th className="px-4 py-3">Department / Team</th>
                          <th className="px-4 py-3">Scope</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {filteredEmployees.map((employee) => (
                          <tr key={employee.id}>
                            <td className="px-4 py-3 font-medium text-slate-900">{employee.full_name ?? "-"}</td>
                            <td className="px-4 py-3">{employee.employee_code ?? "-"}</td>
                            <td className="px-4 py-3">{employee.designation ?? "-"}</td>
                            <td className="px-4 py-3">{employee.department_name ?? "-"} / {employee.team_name ?? "-"}</td>
                            <td className="px-4 py-3">{employee.is_direct_report ? "Direct report" : "Self / scoped"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ProfileTableShell>
                </div>
              </>
            )}
          </SurfacePanel>

          <div className="grid gap-5 xl:grid-cols-2">
            <SurfacePanel
              title="Shift assignments"
              description="Edit current shift windows or remove them if the employee roster changes."
            >
              {assignments.length === 0 ? (
                <EmptyState title="No shift assignments loaded" subtitle="Select an employee and load their assignments to review the active schedule." compact />
              ) : (
                <>
                  <div className="grid gap-3 lg:hidden">
                    {assignments.map((row) => (
                      <div key={row.id} className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                        <div className="space-y-1">
                          <p className="truncate text-base font-semibold text-slate-950">
                            {templateOptions.get(row.shift_template_id)?.name ?? row.shift_template_id}
                          </p>
                          <p className="truncate text-xs text-slate-500">{row.id.slice(0, 8)}...</p>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm">
                          <div>
                            <p className={cardFieldLabelClassName}>Effective range</p>
                            <p className={cardFieldValueClassName}>{row.effective_from} to {row.effective_to ?? "-"}</p>
                          </div>
                          <div>
                            <p className={cardFieldLabelClassName}>Created</p>
                            <p className={cardFieldValueClassName}>{new Date(row.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEditingShift(row)}>
                            Edit
                          </Button>
                          <Button type="button" variant="secondary" className="rounded-full" onClick={() => void onRemoveShift(row.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    <ProfileTableShell>
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Assignment</th>
                            <th className="px-4 py-3">Shift template</th>
                            <th className="px-4 py-3">Effective from</th>
                            <th className="px-4 py-3">Effective to</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                          {assignments.map((row) => (
                            <tr key={row.id}>
                              <td className="px-4 py-3">{row.id.slice(0, 8)}...</td>
                              <td className="px-4 py-3">
                                {templateOptions.get(row.shift_template_id)?.name ?? row.shift_template_id}
                              </td>
                              <td className="px-4 py-3">{row.effective_from}</td>
                              <td className="px-4 py-3">{row.effective_to ?? "-"}</td>
                              <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEditingShift(row)}>
                                    Edit
                                  </Button>
                                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => void onRemoveShift(row.id)}>
                                    Remove
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ProfileTableShell>
                  </div>
                </>
              )}
            </SurfacePanel>

            <SurfacePanel
              title="Break assignments"
              description="Keep break windows clean and editable for the selected employee."
            >
              {breakAssignments.length === 0 ? (
                <EmptyState title="No break assignments loaded" subtitle="Select an employee and load break windows to review the current break plan." compact />
              ) : (
                <>
                  <div className="grid gap-3 lg:hidden">
                    {breakAssignments.map((row) => (
                      <div key={row.id} className="rounded-[20px] border border-slate-200 bg-slate-50/70 p-4">
                        <div className="space-y-1">
                          <p className="truncate text-base font-semibold text-slate-950">{row.break_name ?? "Assigned break"}</p>
                          <p className="truncate text-xs text-slate-500">{row.break_start_time} - {row.break_end_time}</p>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm">
                          <div>
                            <p className={cardFieldLabelClassName}>Effective range</p>
                            <p className={cardFieldValueClassName}>{row.effective_from} to {row.effective_to ?? "-"}</p>
                          </div>
                          <div>
                            <p className={cardFieldLabelClassName}>Created</p>
                            <p className={cardFieldValueClassName}>{new Date(row.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEditingBreak(row)}>
                            Edit
                          </Button>
                          <Button type="button" variant="secondary" className="rounded-full" onClick={() => void onRemoveBreak(row.id)}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    <ProfileTableShell>
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Break</th>
                            <th className="px-4 py-3">Start</th>
                            <th className="px-4 py-3">End</th>
                            <th className="px-4 py-3">Effective from</th>
                            <th className="px-4 py-3">Effective to</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                          {breakAssignments.map((row) => (
                            <tr key={row.id}>
                              <td className="px-4 py-3">{row.break_name ?? "Assigned break"}</td>
                              <td className="px-4 py-3">{row.break_start_time}</td>
                              <td className="px-4 py-3">{row.break_end_time}</td>
                              <td className="px-4 py-3">{row.effective_from}</td>
                              <td className="px-4 py-3">{row.effective_to ?? "-"}</td>
                              <td className="px-4 py-3">{new Date(row.created_at).toLocaleString()}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEditingBreak(row)}>
                                    Edit
                                  </Button>
                                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => void onRemoveBreak(row.id)}>
                                    Remove
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ProfileTableShell>
                  </div>
                </>
              )}
            </SurfacePanel>
          </div>
        </>
      ) : null}
    </PageContainer>
  );
};

export default ShiftAssignmentsPageClient;
