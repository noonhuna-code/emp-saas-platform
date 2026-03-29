"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EmployeeEducation } from "@/lib/types/profile";
import {
  ProfilePanel,
  ProfileSectionCard,
  ProfileTableShell,
  SectionActionBar,
  profileFieldClassName,
  profileLabelClassName,
  profileTableActionCellClassName,
  profileTableCellClassName,
  profileTableClassName,
  profileTableHeadClassName,
} from "@/components/profile/ProfileSectionPrimitives";

type QualificationDraft = {
  institution: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
  grade: string;
};

const emptyDraft: QualificationDraft = {
  institution: "",
  degree: "",
  field_of_study: "",
  start_date: "",
  end_date: "",
  grade: "",
};

const formatTimeline = (start?: string | null, end?: string | null) => {
  const left = start ? new Date(start).toLocaleDateString() : "—";
  const right = end ? new Date(end).toLocaleDateString() : "Present";
  return `${left} — ${right}`;
};

export const QualificationsSection = ({
  education,
  onAdd,
  onUpdate,
  onDelete,
  canEdit,
}: {
  education: EmployeeEducation[];
  onAdd: (payload: Omit<EmployeeEducation, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (educationId: string, payload: Omit<EmployeeEducation, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onDelete: (educationId: string) => Promise<void>;
  canEdit: boolean;
}) => {
  const [draft, setDraft] = useState<QualificationDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<QualificationDraft>(emptyDraft);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const rows = useMemo(() => [...education].sort((a, b) => a.institution.localeCompare(b.institution)), [education]);

  const handleAdd = async () => {
    if (!draft.institution) return;
    await onAdd({
      institution: draft.institution,
      degree: draft.degree || null,
      field_of_study: draft.field_of_study || null,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
      grade: draft.grade || null,
    });
    setDraft(emptyDraft);
    setShowCreateForm(false);
  };

  const startEdit = (entry: EmployeeEducation) => {
    setShowCreateForm(false);
    setEditingId(entry.id);
    setEditingDraft({
      institution: entry.institution,
      degree: entry.degree ?? "",
      field_of_study: entry.field_of_study ?? "",
      start_date: entry.start_date ?? "",
      end_date: entry.end_date ?? "",
      grade: entry.grade ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId || !editingDraft.institution) return;
    await onUpdate(editingId, {
      institution: editingDraft.institution,
      degree: editingDraft.degree || null,
      field_of_study: editingDraft.field_of_study || null,
      start_date: editingDraft.start_date || null,
      end_date: editingDraft.end_date || null,
      grade: editingDraft.grade || null,
    });
    setEditingId(null);
  };

  return (
    <ProfileSectionCard
      title="Qualifications"
      description="Keep education history in one dense register with less page travel and clearer comparisons."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? "Hide form" : "Add qualification"}
          </Button>
        ) : undefined
      }
    >
      {showCreateForm && canEdit ? (
        <ProfilePanel title="Add qualification" description="Capture institution, qualification, study focus, and dates.">
          <div className="grid gap-4 xl:grid-cols-2">
            <label className={profileLabelClassName}>
              <span>Institution</span>
              <input className={profileFieldClassName} value={draft.institution} onChange={(event) => setDraft((prev) => ({ ...prev, institution: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Degree / qualification</span>
              <input className={profileFieldClassName} value={draft.degree} onChange={(event) => setDraft((prev) => ({ ...prev, degree: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Field of study</span>
              <input className={profileFieldClassName} value={draft.field_of_study} onChange={(event) => setDraft((prev) => ({ ...prev, field_of_study: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Grade / score</span>
              <input className={profileFieldClassName} value={draft.grade} onChange={(event) => setDraft((prev) => ({ ...prev, grade: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Start date</span>
              <input className={profileFieldClassName} type="date" value={draft.start_date} onChange={(event) => setDraft((prev) => ({ ...prev, start_date: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>End date</span>
              <input className={profileFieldClassName} type="date" value={draft.end_date} onChange={(event) => setDraft((prev) => ({ ...prev, end_date: event.target.value }))} />
            </label>
          </div>
          <SectionActionBar>
            <Button type="button" variant="secondary" className="rounded-full" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={handleAdd} disabled={!draft.institution}>
              Save qualification
            </Button>
          </SectionActionBar>
        </ProfilePanel>
      ) : null}

      {editingId ? (
        <ProfilePanel title="Edit qualification" description="Update the selected education row without leaving the register.">
          <div className="grid gap-4 xl:grid-cols-2">
            <label className={profileLabelClassName}>
              <span>Institution</span>
              <input className={profileFieldClassName} value={editingDraft.institution} onChange={(event) => setEditingDraft((prev) => ({ ...prev, institution: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Degree / qualification</span>
              <input className={profileFieldClassName} value={editingDraft.degree} onChange={(event) => setEditingDraft((prev) => ({ ...prev, degree: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Field of study</span>
              <input className={profileFieldClassName} value={editingDraft.field_of_study} onChange={(event) => setEditingDraft((prev) => ({ ...prev, field_of_study: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Grade / score</span>
              <input className={profileFieldClassName} value={editingDraft.grade} onChange={(event) => setEditingDraft((prev) => ({ ...prev, grade: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Start date</span>
              <input className={profileFieldClassName} type="date" value={editingDraft.start_date} onChange={(event) => setEditingDraft((prev) => ({ ...prev, start_date: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>End date</span>
              <input className={profileFieldClassName} type="date" value={editingDraft.end_date} onChange={(event) => setEditingDraft((prev) => ({ ...prev, end_date: event.target.value }))} />
            </label>
          </div>
          <SectionActionBar>
            <Button type="button" variant="secondary" className="rounded-full" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={saveEdit} disabled={!editingDraft.institution}>
              Save changes
            </Button>
          </SectionActionBar>
        </ProfilePanel>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No qualifications recorded" subtitle="Add education records so profile completeness and readiness stay current." />
      ) : (
        <ProfileTableShell>
          <table className={profileTableClassName}>
            <thead className={profileTableHeadClassName}>
              <tr>
                <th className="px-4 py-3">Institution</th>
                <th className="px-4 py-3">Qualification</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Timeline</th>
                <th className="px-4 py-3">Grade</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className={profileTableCellClassName}>
                    <div className="font-medium text-slate-900">{entry.institution}</div>
                  </td>
                  <td className={profileTableCellClassName}>{entry.degree ?? "-"}</td>
                  <td className={profileTableCellClassName}>{entry.field_of_study ?? "-"}</td>
                  <td className={profileTableCellClassName}>{formatTimeline(entry.start_date, entry.end_date)}</td>
                  <td className={profileTableCellClassName}>{entry.grade ?? "-"}</td>
                  <td className={profileTableActionCellClassName}>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => startEdit(entry)}>
                          Edit
                        </Button>
                        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => void onDelete(entry.id)}>
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">Read only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ProfileTableShell>
      )}
    </ProfileSectionCard>
  );
};
