"use client";

import { useState } from "react";
import type { EmployeeSkill } from "@/lib/types/profile";

export const SkillsSection = ({
  skills,
  onAdd,
  onUpdate,
  onDelete,
  canEdit
}: {
  skills: EmployeeSkill[];
  onAdd: (payload: Omit<EmployeeSkill, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (skillId: string, payload: Omit<EmployeeSkill, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onDelete: (skillId: string) => Promise<void>;
  canEdit: boolean;
}) => {
  const [draft, setDraft] = useState({ skill_name: "", proficiency: "", years_experience: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({ skill_name: "", proficiency: "", years_experience: "" });

  const handleAdd = async () => {
    if (!draft.skill_name) return;
    await onAdd({
      skill_name: draft.skill_name,
      proficiency: draft.proficiency || null,
      years_experience: draft.years_experience ? Number(draft.years_experience) : null
    });
    setDraft({ skill_name: "", proficiency: "", years_experience: "" });
  };

  const startEdit = (skill: EmployeeSkill) => {
    setEditingId(skill.id);
    setEditingDraft({
      skill_name: skill.skill_name,
      proficiency: skill.proficiency ?? "",
      years_experience: skill.years_experience?.toString() ?? ""
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await onUpdate(editingId, {
      skill_name: editingDraft.skill_name,
      proficiency: editingDraft.proficiency || null,
      years_experience: editingDraft.years_experience ? Number(editingDraft.years_experience) : null
    });
    setEditingId(null);
  };

  return (
    <section className="card stack">
      <div>
        <h3>Skills</h3>
        <p className="muted">Capabilities and proficiency levels.</p>
      </div>

      {canEdit ? (
        <>
          <div className="form-grid form-grid--three">
            <label>
              Skill
              <input value={draft.skill_name} onChange={(event) => setDraft((prev) => ({ ...prev, skill_name: event.target.value }))} />
            </label>
            <label>
              Proficiency
              <input value={draft.proficiency} onChange={(event) => setDraft((prev) => ({ ...prev, proficiency: event.target.value }))} />
            </label>
            <label>
              Years
              <input value={draft.years_experience} onChange={(event) => setDraft((prev) => ({ ...prev, years_experience: event.target.value }))} />
            </label>
          </div>

          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="secondary-btn" type="button" onClick={handleAdd}>Add skill</button>
          </div>
        </>
      ) : (
        <p className="muted">Skill updates are restricted to permitted roles.</p>
      )}

      <div className="stack">
        {skills.length === 0 ? <p className="muted">No skills recorded.</p> : null}
        {skills.map((skill) => (
          <div key={skill.id} className="card card--nested">
            {editingId === skill.id ? (
              <div className="form-grid form-grid--three">
                <label>
                  Skill
                  <input value={editingDraft.skill_name} onChange={(event) => setEditingDraft((prev) => ({ ...prev, skill_name: event.target.value }))} />
                </label>
                <label>
                  Proficiency
                  <input value={editingDraft.proficiency} onChange={(event) => setEditingDraft((prev) => ({ ...prev, proficiency: event.target.value }))} />
                </label>
                <label>
                  Years
                  <input value={editingDraft.years_experience} onChange={(event) => setEditingDraft((prev) => ({ ...prev, years_experience: event.target.value }))} />
                </label>
                <div className="row" style={{ justifyContent: "flex-end", gridColumn: "1 / -1" }}>
                  <button className="secondary-btn" type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="primary-btn" type="button" onClick={saveEdit}>Save</button>
                </div>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong>{skill.skill_name}</strong>
                  <span className="muted">{skill.proficiency ?? ""}</span>
                </div>
                {canEdit ? (
                  <div className="row">
                    <button className="secondary-btn" type="button" onClick={() => startEdit(skill)}>Edit</button>
                    <button className="secondary-btn" type="button" onClick={() => onDelete(skill.id)}>Remove</button>
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
