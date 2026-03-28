"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EmployeeSkill } from "@/lib/types/profile";
import {
  ProfilePanel,
  ProfileSectionCard,
  ReadonlyField,
  SectionActionBar,
  profileFieldClassName,
  profileLabelClassName,
} from "@/components/profile/ProfileSectionPrimitives";

export const SkillsSection = ({
  skills,
  onAdd,
  onUpdate,
  onDelete,
  canEdit,
}: {
  skills: EmployeeSkill[];
  onAdd: (payload: Omit<EmployeeSkill, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (skillId: string, payload: Omit<EmployeeSkill, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onDelete: (skillId: string) => Promise<void>;
  canEdit: boolean;
}) => {
  const addFormRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState({ skill_name: "", proficiency: "", years_experience: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({ skill_name: "", proficiency: "", years_experience: "" });

  const handleAdd = async () => {
    if (!draft.skill_name) return;
    await onAdd({
      skill_name: draft.skill_name,
      proficiency: draft.proficiency || null,
      years_experience: draft.years_experience ? Number(draft.years_experience) : null,
    });
    setDraft({ skill_name: "", proficiency: "", years_experience: "" });
  };

  const focusAddForm = () => {
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    addFormRef.current?.querySelector("input")?.focus();
  };

  const startEdit = (skill: EmployeeSkill) => {
    setEditingId(skill.id);
    setEditingDraft({
      skill_name: skill.skill_name,
      proficiency: skill.proficiency ?? "",
      years_experience: skill.years_experience?.toString() ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await onUpdate(editingId, {
      skill_name: editingDraft.skill_name,
      proficiency: editingDraft.proficiency || null,
      years_experience: editingDraft.years_experience ? Number(editingDraft.years_experience) : null,
    });
    setEditingId(null);
  };

  return (
    <ProfileSectionCard
      title="Skills"
      description="Maintain a high-signal inventory of role capabilities, proficiency, and experience depth."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={focusAddForm}>
            Add skill
          </Button>
        ) : undefined
      }
    >
      {canEdit ? (
        <ProfilePanel title="Add skill" description="Capture the skill name, proficiency level, and years of experience.">
          <div ref={addFormRef} className="grid gap-4 xl:grid-cols-3">
            <label className={profileLabelClassName}>
              <span>Skill</span>
              <input className={profileFieldClassName} value={draft.skill_name} onChange={(event) => setDraft((prev) => ({ ...prev, skill_name: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Proficiency</span>
              <input className={profileFieldClassName} value={draft.proficiency} onChange={(event) => setDraft((prev) => ({ ...prev, proficiency: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Years of experience</span>
              <input className={profileFieldClassName} value={draft.years_experience} onChange={(event) => setDraft((prev) => ({ ...prev, years_experience: event.target.value }))} />
            </label>
          </div>
          <SectionActionBar>
            <Button type="button" className="rounded-full" onClick={handleAdd} disabled={!draft.skill_name}>
              Save skill
            </Button>
          </SectionActionBar>
        </ProfilePanel>
      ) : null}

      <div className="space-y-4">
        {skills.length === 0 ? (
          <EmptyState title="No skills recorded yet" subtitle="Add capabilities to make project staffing, reviews, and growth planning easier." />
        ) : null}

        {skills.map((skill) => (
          <ProfilePanel key={skill.id} title={skill.skill_name} description={skill.proficiency ?? "Proficiency not set"}>
            {editingId === skill.id ? (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-3">
                  <label className={profileLabelClassName}>
                    <span>Skill</span>
                    <input className={profileFieldClassName} value={editingDraft.skill_name} onChange={(event) => setEditingDraft((prev) => ({ ...prev, skill_name: event.target.value }))} />
                  </label>
                  <label className={profileLabelClassName}>
                    <span>Proficiency</span>
                    <input className={profileFieldClassName} value={editingDraft.proficiency} onChange={(event) => setEditingDraft((prev) => ({ ...prev, proficiency: event.target.value }))} />
                  </label>
                  <label className={profileLabelClassName}>
                    <span>Years of experience</span>
                    <input className={profileFieldClassName} value={editingDraft.years_experience} onChange={(event) => setEditingDraft((prev) => ({ ...prev, years_experience: event.target.value }))} />
                  </label>
                </div>
                <SectionActionBar>
                  <Button type="button" variant="secondary" className="rounded-full" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                  <Button type="button" className="rounded-full" onClick={saveEdit}>
                    Save changes
                  </Button>
                </SectionActionBar>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  <ReadonlyField label="Skill" value={skill.skill_name} />
                  <ReadonlyField label="Proficiency" value={skill.proficiency ?? "—"} />
                  <ReadonlyField label="Experience" value={skill.years_experience !== null && skill.years_experience !== undefined ? `${skill.years_experience} years` : "—"} />
                </div>
                {canEdit ? (
                  <SectionActionBar>
                    <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEdit(skill)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" className="rounded-full" onClick={() => onDelete(skill.id)}>
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
