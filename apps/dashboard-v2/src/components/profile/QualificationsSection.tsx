"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EmployeeEducation } from "@/lib/types/profile";
import {
  ProfilePanel,
  ProfileSectionCard,
  ReadonlyField,
  SectionActionBar,
  profileFieldClassName,
  profileLabelClassName,
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
  const addFormRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<QualificationDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<QualificationDraft>(emptyDraft);

  const focusAddForm = () => {
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    addFormRef.current?.querySelector("input")?.focus();
  };

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
  };

  const startEdit = (entry: EmployeeEducation) => {
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
      description="Maintain academic qualifications and formal education records used in role readiness and profile completeness."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={focusAddForm}>
            Add qualification
          </Button>
        ) : undefined
      }
    >
      {canEdit ? (
        <ProfilePanel title="Add qualification" description="Capture institution, degree, field of study, and completion dates.">
          <div ref={addFormRef} className="grid gap-4 xl:grid-cols-2">
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
            <Button type="button" className="rounded-full" onClick={handleAdd} disabled={!draft.institution}>
              Save qualification
            </Button>
          </SectionActionBar>
        </ProfilePanel>
      ) : null}

      <div className="space-y-4">
        {education.length === 0 ? (
          <EmptyState title="No qualifications recorded yet" subtitle="Add academic records so the profile shows education context alongside skills and documents." />
        ) : null}

        {education.map((entry) => (
          <ProfilePanel key={entry.id} title={entry.institution} description={entry.degree ?? "Qualification"}>
            {editingId === entry.id ? (
              <div className="space-y-4">
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
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ReadonlyField label="Qualification" value={entry.degree ?? "—"} />
                  <ReadonlyField label="Field of study" value={entry.field_of_study ?? "—"} />
                  <ReadonlyField label="Timeline" value={[entry.start_date ?? "—", entry.end_date ?? "Present"].join(" to ")} />
                  <ReadonlyField label="Grade" value={entry.grade ?? "—"} />
                </div>
                {canEdit ? (
                  <SectionActionBar>
                    <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEdit(entry)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" className="rounded-full" onClick={() => onDelete(entry.id)}>
                      Remove
                    </Button>
                  </SectionActionBar>
                ) : null}
              </div>
            )}
          </ProfilePanel>
        ))}
      </div>
    </ProfileSectionCard>
  );
};
