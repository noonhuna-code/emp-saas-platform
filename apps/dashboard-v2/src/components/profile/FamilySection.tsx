"use client";

import { useState } from "react";
import type { EmployeeFamilyMember } from "@/lib/types/profile";

export const FamilySection = ({
  family,
  onAdd,
  onUpdate,
  onDelete,
  canEdit
}: {
  family: EmployeeFamilyMember[];
  onAdd: (payload: Omit<EmployeeFamilyMember, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (memberId: string, payload: Omit<EmployeeFamilyMember, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
  canEdit: boolean;
}) => {
  const [draft, setDraft] = useState({ full_name: "", relationship: "", date_of_birth: "", phone_number: "", is_dependent: false });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({ full_name: "", relationship: "", date_of_birth: "", phone_number: "", is_dependent: false });

  const handleAdd = async () => {
    if (!draft.full_name || !draft.relationship) return;
    await onAdd({
      full_name: draft.full_name,
      relationship: draft.relationship,
      date_of_birth: draft.date_of_birth || null,
      phone_number: draft.phone_number || null,
      is_dependent: draft.is_dependent
    });
    setDraft({ full_name: "", relationship: "", date_of_birth: "", phone_number: "", is_dependent: false });
  };

  const startEdit = (member: EmployeeFamilyMember) => {
    setEditingId(member.id);
    setEditingDraft({
      full_name: member.full_name,
      relationship: member.relationship,
      date_of_birth: member.date_of_birth ?? "",
      phone_number: member.phone_number ?? "",
      is_dependent: Boolean(member.is_dependent)
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await onUpdate(editingId, {
      full_name: editingDraft.full_name,
      relationship: editingDraft.relationship,
      date_of_birth: editingDraft.date_of_birth || null,
      phone_number: editingDraft.phone_number || null,
      is_dependent: editingDraft.is_dependent
    });
    setEditingId(null);
  };

  return (
    <section className="card stack">
      <div>
        <h3>Family</h3>
        <p className="muted">Dependents and emergency family contacts.</p>
      </div>

      {canEdit ? (
        <>
          <div className="form-grid form-grid--three">
            <label>
              Full name
              <input value={draft.full_name} onChange={(event) => setDraft((prev) => ({ ...prev, full_name: event.target.value }))} />
            </label>
            <label>
              Relationship
              <input value={draft.relationship} onChange={(event) => setDraft((prev) => ({ ...prev, relationship: event.target.value }))} />
            </label>
            <label>
              Date of birth
              <input type="date" value={draft.date_of_birth} onChange={(event) => setDraft((prev) => ({ ...prev, date_of_birth: event.target.value }))} />
            </label>
            <label>
              Phone
              <input value={draft.phone_number} onChange={(event) => setDraft((prev) => ({ ...prev, phone_number: event.target.value }))} />
            </label>
            <label className="toggle">
              <input
                type="checkbox"
                checked={draft.is_dependent}
                onChange={(event) => setDraft((prev) => ({ ...prev, is_dependent: event.target.checked }))}
              />
              Dependent
            </label>
          </div>

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="secondary-btn" type="button" onClick={handleAdd}>Add family member</button>
          </div>
        </>
      ) : (
        <p className="muted">Family updates are restricted to permitted roles.</p>
      )}

      <div className="stack">
        {family.length === 0 ? <p className="muted">No family members recorded.</p> : null}
        {family.map((member) => (
          <div key={member.id} className="card card--nested">
            {editingId === member.id ? (
              <div className="form-grid form-grid--three">
                <label>
                  Full name
                  <input value={editingDraft.full_name} onChange={(event) => setEditingDraft((prev) => ({ ...prev, full_name: event.target.value }))} />
                </label>
                <label>
                  Relationship
                  <input value={editingDraft.relationship} onChange={(event) => setEditingDraft((prev) => ({ ...prev, relationship: event.target.value }))} />
                </label>
                <label>
                  Date of birth
                  <input type="date" value={editingDraft.date_of_birth} onChange={(event) => setEditingDraft((prev) => ({ ...prev, date_of_birth: event.target.value }))} />
                </label>
                <label>
                  Phone
                  <input value={editingDraft.phone_number} onChange={(event) => setEditingDraft((prev) => ({ ...prev, phone_number: event.target.value }))} />
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={editingDraft.is_dependent}
                    onChange={(event) => setEditingDraft((prev) => ({ ...prev, is_dependent: event.target.checked }))}
                  />
                  Dependent
                </label>
                <div className="row" style={{ justifyContent: "flex-end", gridColumn: "1 / -1" }}>
                  <button className="secondary-btn" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="primary-btn" type="button" onClick={saveEdit}>Save</button>
                </div>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{member.full_name}</strong>
                  <span className="muted">{member.relationship}</span>
                </div>
                {canEdit ? (
                  <div className="row">
                    <button className="secondary-btn" type="button" onClick={() => startEdit(member)}>Edit</button>
                    <button className="secondary-btn" type="button" onClick={() => onDelete(member.id)}>Remove</button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
