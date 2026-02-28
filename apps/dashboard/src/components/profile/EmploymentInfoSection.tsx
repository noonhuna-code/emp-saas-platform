"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { EmployeeLookupResponse } from "@/lib/types/profile";

type EmploymentFormState = {
  department_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  designation?: string | null;
  job_level?: string | null;
  employment_type?: string | null;
  work_mode?: string | null;
  employment_status?: string | null;
  confirmation_date?: string | null;
  probation_end_date?: string | null;
  exit_date?: string | null;
  termination_reason?: string | null;
  employee_code?: string | null;
  profile_image_url?: string | null;
};

export const EmploymentInfoSection = ({
  employee,
  lookups,
  canEdit,
  onSave
}: {
  employee: Record<string, unknown>;
  lookups: EmployeeLookupResponse | null;
  canEdit: boolean;
  onSave: (payload: EmploymentFormState) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EmploymentFormState>({});

  useEffect(() => {
    setForm({
      department_id: (employee.department_id as string | null | undefined) ?? null,
      team_id: (employee.team_id as string | null | undefined) ?? null,
      manager_id: (employee.manager_id as string | null | undefined) ?? null,
      designation: (employee.designation as string | null | undefined) ?? null,
      job_level: (employee.job_level as string | null | undefined) ?? null,
      employment_type: (employee.employment_type as string | null | undefined) ?? null,
      work_mode: (employee.work_mode as string | null | undefined) ?? null,
      employment_status: (employee.employment_status as string | null | undefined) ?? null,
      confirmation_date: (employee.confirmation_date as string | null | undefined) ?? null,
      probation_end_date: (employee.probation_end_date as string | null | undefined) ?? null,
      exit_date: (employee.exit_date as string | null | undefined) ?? null,
      termination_reason: (employee.termination_reason as string | null | undefined) ?? null,
      employee_code: (employee.employee_code as string | null | undefined) ?? null,
      profile_image_url: (employee.profile_image_url as string | null | undefined) ?? null
    });
  }, [employee]);

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h3>Employment Info</h3>
          <p className="muted">Job assignment, status, and reporting structure.</p>
        </div>
        {canEdit ? (
          <button className="secondary-btn" type="button" onClick={() => setEditing((prev) => !prev)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        ) : (
          <StatusBadge status="Read-only" />
        )}
      </div>

      <div className="form-grid form-grid--two">
        <label>
          Employee code
          <input
            type="text"
            value={form.employee_code ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, employee_code: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Designation
          <input
            type="text"
            value={form.designation ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, designation: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Job level
          <input
            type="text"
            value={form.job_level ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, job_level: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Employment type
          <input
            type="text"
            value={form.employment_type ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, employment_type: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Work mode
          <input
            type="text"
            value={form.work_mode ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, work_mode: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Employment status
          <input
            type="text"
            value={form.employment_status ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, employment_status: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
      </div>

      <div className="form-grid form-grid--two">
        <label>
          Department
          <select
            value={form.department_id ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, department_id: event.target.value || null }))}
            disabled={!editing}
          >
            <option value="">Unassigned</option>
            {lookups?.departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </label>
        <label>
          Team
          <select
            value={form.team_id ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, team_id: event.target.value || null }))}
            disabled={!editing}
          >
            <option value="">Unassigned</option>
            {lookups?.teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </label>
        <label>
          Reporting manager
          <select
            value={form.manager_id ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, manager_id: event.target.value || null }))}
            disabled={!editing}
          >
            <option value="">None</option>
            {lookups?.managers.map((manager) => (
              <option key={manager.id} value={manager.id}>{manager.full_name}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="form-grid form-grid--two">
        <label>
          Confirmation date
          <input
            type="date"
            value={form.confirmation_date ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmation_date: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Probation end date
          <input
            type="date"
            value={form.probation_end_date ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, probation_end_date: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Exit date
          <input
            type="date"
            value={form.exit_date ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, exit_date: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Termination reason
          <input
            type="text"
            value={form.termination_reason ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, termination_reason: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
      </div>

      {editing ? (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="primary-btn" type="button" onClick={handleSave}>Save changes</button>
        </div>
      ) : null}
    </section>
  );
};
