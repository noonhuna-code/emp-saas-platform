"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EmployeeSkill } from "@/lib/types/profile";
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

const emptyDraft = { skill_name: "", proficiency: "", years_experience: "" };

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
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(emptyDraft);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const rows = useMemo(() => [...skills].sort((a, b) => a.skill_name.localeCompare(b.skill_name)), [skills]);

  const handleAdd = async () => {
    if (!draft.skill_name) return;
    await onAdd({
      skill_name: draft.skill_name,
      proficiency: draft.proficiency || null,
      years_experience: draft.years_experience ? Number(draft.years_experience) : null,
    });
    setDraft(emptyDraft);
    setShowCreateForm(false);
  };

  const startEdit = (skill: EmployeeSkill) => {
    setShowCreateForm(false);
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
      description="Track capability signals in one compact inventory instead of a long series of stacked cards."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? "Hide form" : "Add skill"}
          </Button>
        ) : undefined
      }
    >
      {showCreateForm && canEdit ? (
        <ProfilePanel title="Add skill" description="Capture skill name, proficiency, and years of experience.">
          <div className="grid gap-4 xl:grid-cols-3">
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
            <Button type="button" variant="secondary" className="rounded-full" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={handleAdd} disabled={!draft.skill_name}>
              Save skill
            </Button>
          </SectionActionBar>
        </ProfilePanel>
      ) : null}

      {editingId ? (
        <ProfilePanel title="Edit skill" description="Update the selected skill without leaving the table view.">
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
        </ProfilePanel>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No skills recorded" subtitle="Add capability data so the profile can stay useful for staffing, growth, and reviews." />
      ) : (
        <ProfileTableShell>
          <table className={profileTableClassName}>
            <thead className={profileTableHeadClassName}>
              <tr>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3">Proficiency</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((skill) => (
                <tr key={skill.id} className="align-top">
                  <td className={profileTableCellClassName}>
                    <div className="font-medium text-slate-900">{skill.skill_name}</div>
                  </td>
                  <td className={profileTableCellClassName}>{skill.proficiency ?? "-"}</td>
                  <td className={profileTableCellClassName}>
                    {skill.years_experience !== null && skill.years_experience !== undefined ? `${skill.years_experience} years` : "-"}
                  </td>
                  <td className={profileTableCellClassName}>
                    {skill.updated_at ? new Date(skill.updated_at).toLocaleDateString() : "-"}
                  </td>
                  <td className={profileTableActionCellClassName}>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => startEdit(skill)}>
                          Edit
                        </Button>
                        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => void onDelete(skill.id)}>
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
