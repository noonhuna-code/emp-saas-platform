"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EmployeeFamilyMember } from "@/lib/types/profile";
import {
  ProfilePanel,
  ProfileSectionCard,
  ReadonlyField,
  SectionActionBar,
  profileFieldClassName,
  profileLabelClassName,
} from "@/components/profile/ProfileSectionPrimitives";

export const FamilySection = ({
  family,
  onAdd,
  onUpdate,
  onDelete,
  canEdit,
}: {
  family: EmployeeFamilyMember[];
  onAdd: (payload: Omit<EmployeeFamilyMember, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdate: (memberId: string, payload: Omit<EmployeeFamilyMember, "id" | "company_id" | "employee_id" | "created_at" | "updated_at">) => Promise<void>;
  onDelete: (memberId: string) => Promise<void>;
  canEdit: boolean;
}) => {
  const [draft, setDraft] = useState({
    full_name: "",
    relationship: "",
    date_of_birth: "",
    phone_number: "",
    is_dependent: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({
    full_name: "",
    relationship: "",
    date_of_birth: "",
    phone_number: "",
    is_dependent: false,
  });

  const handleAdd = async () => {
    if (!draft.full_name || !draft.relationship) return;
    await onAdd({
      full_name: draft.full_name,
      relationship: draft.relationship,
      date_of_birth: draft.date_of_birth || null,
      phone_number: draft.phone_number || null,
      is_dependent: draft.is_dependent,
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
      is_dependent: Boolean(member.is_dependent),
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await onUpdate(editingId, {
      full_name: editingDraft.full_name,
      relationship: editingDraft.relationship,
      date_of_birth: editingDraft.date_of_birth || null,
      phone_number: editingDraft.phone_number || null,
      is_dependent: editingDraft.is_dependent,
    });
    setEditingId(null);
  };

  return (
    <ProfileSectionCard
      title="Family"
      description="Dependents and household contacts used for benefits, emergency communication, and policy context."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={handleAdd} disabled={!draft.full_name || !draft.relationship}>
            Add family member
          </Button>
        ) : undefined
      }
    >
      {canEdit ? (
        <ProfilePanel title="Add household record" description="Capture dependents and important family contacts in a consistent format.">
          <div className="grid gap-4 xl:grid-cols-2">
            <label className={profileLabelClassName}>
              <span>Full name</span>
              <input className={profileFieldClassName} value={draft.full_name} onChange={(event) => setDraft((prev) => ({ ...prev, full_name: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Relationship</span>
              <input className={profileFieldClassName} value={draft.relationship} onChange={(event) => setDraft((prev) => ({ ...prev, relationship: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Date of birth</span>
              <input className={profileFieldClassName} type="date" value={draft.date_of_birth} onChange={(event) => setDraft((prev) => ({ ...prev, date_of_birth: event.target.value }))} />
            </label>
            <label className={profileLabelClassName}>
              <span>Phone number</span>
              <input className={profileFieldClassName} value={draft.phone_number} onChange={(event) => setDraft((prev) => ({ ...prev, phone_number: event.target.value }))} />
            </label>
          </div>
          <div className="pt-3">
            <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                type="checkbox"
                checked={draft.is_dependent}
                onChange={(event) => setDraft((prev) => ({ ...prev, is_dependent: event.target.checked }))}
              />
              Mark as dependent
            </label>
          </div>
        </ProfilePanel>
      ) : null}

      <div className="space-y-4">
        {family.length === 0 ? (
          <EmptyState title="No household records yet" subtitle="Add a family member or dependent to keep contact and benefits records complete." />
        ) : null}

        {family.map((member) => (
          <ProfilePanel
            key={member.id}
            title={member.full_name}
            description={`${member.relationship}${member.is_dependent ? " • Dependent" : ""}`}
          >
            {editingId === member.id ? (
              <div className="space-y-4">
                <div className="grid gap-4 xl:grid-cols-2">
                  <label className={profileLabelClassName}>
                    <span>Full name</span>
                    <input className={profileFieldClassName} value={editingDraft.full_name} onChange={(event) => setEditingDraft((prev) => ({ ...prev, full_name: event.target.value }))} />
                  </label>
                  <label className={profileLabelClassName}>
                    <span>Relationship</span>
                    <input className={profileFieldClassName} value={editingDraft.relationship} onChange={(event) => setEditingDraft((prev) => ({ ...prev, relationship: event.target.value }))} />
                  </label>
                  <label className={profileLabelClassName}>
                    <span>Date of birth</span>
                    <input className={profileFieldClassName} type="date" value={editingDraft.date_of_birth} onChange={(event) => setEditingDraft((prev) => ({ ...prev, date_of_birth: event.target.value }))} />
                  </label>
                  <label className={profileLabelClassName}>
                    <span>Phone number</span>
                    <input className={profileFieldClassName} value={editingDraft.phone_number} onChange={(event) => setEditingDraft((prev) => ({ ...prev, phone_number: event.target.value }))} />
                  </label>
                </div>
                <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    type="checkbox"
                    checked={editingDraft.is_dependent}
                    onChange={(event) => setEditingDraft((prev) => ({ ...prev, is_dependent: event.target.checked }))}
                  />
                  Mark as dependent
                </label>
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
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <ReadonlyField label="Relationship" value={member.relationship} />
                  <ReadonlyField label="Date of birth" value={member.date_of_birth ?? "—"} />
                  <ReadonlyField label="Phone" value={member.phone_number ?? "—"} />
                  <ReadonlyField label="Dependent" value={member.is_dependent ? "Yes" : "No"} />
                </div>
                {canEdit ? (
                  <SectionActionBar>
                    <Button type="button" variant="secondary" className="rounded-full" onClick={() => startEdit(member)}>
                      Edit
                    </Button>
                    <Button type="button" variant="secondary" className="rounded-full" onClick={() => onDelete(member.id)}>
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
