"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { EmployeeFamilyMember } from "@/lib/types/profile";
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

const emptyDraft = {
  full_name: "",
  relationship: "",
  date_of_birth: "",
  phone_number: "",
  is_dependent: false,
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
};

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
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState(emptyDraft);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const rows = useMemo(() => [...family].sort((a, b) => a.full_name.localeCompare(b.full_name)), [family]);

  const handleAdd = async () => {
    if (!draft.full_name || !draft.relationship) return;
    await onAdd({
      full_name: draft.full_name,
      relationship: draft.relationship,
      date_of_birth: draft.date_of_birth || null,
      phone_number: draft.phone_number || null,
      is_dependent: draft.is_dependent,
    });
    setDraft(emptyDraft);
    setShowCreateForm(false);
  };

  const startEdit = (member: EmployeeFamilyMember) => {
    setShowCreateForm(false);
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
      description="Keep dependents and household contacts in a compact register instead of a long card stack."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setShowCreateForm((prev) => !prev)}>
            {showCreateForm ? "Hide form" : "Add family member"}
          </Button>
        ) : undefined
      }
    >
      {showCreateForm && canEdit ? (
        <ProfilePanel title="Add household record" description="Capture one dependent or emergency contact at a time.">
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
          <label className="mt-4 inline-flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              type="checkbox"
              checked={draft.is_dependent}
              onChange={(event) => setDraft((prev) => ({ ...prev, is_dependent: event.target.checked }))}
            />
            Mark as dependent
          </label>
          <SectionActionBar>
            <Button type="button" variant="secondary" className="rounded-full" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={handleAdd} disabled={!draft.full_name || !draft.relationship}>
              Save family member
            </Button>
          </SectionActionBar>
        </ProfilePanel>
      ) : null}

      {editingId ? (
        <ProfilePanel title="Edit household record" description="Update the selected member without leaving the table.">
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
          <label className="mt-4 inline-flex items-center gap-3 text-sm font-medium text-slate-700">
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
        </ProfilePanel>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="No family members recorded" subtitle="Add dependents or household contacts to keep this register complete." />
      ) : (
        <ProfileTableShell>
          <table className={profileTableClassName}>
            <thead className={profileTableHeadClassName}>
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Relationship</th>
                <th className="px-4 py-3">Date of birth</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Dependent</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((member) => (
                <tr key={member.id} className="align-top">
                  <td className={profileTableCellClassName}>
                    <div className="font-medium text-slate-900">{member.full_name}</div>
                  </td>
                  <td className={profileTableCellClassName}>{member.relationship}</td>
                  <td className={profileTableCellClassName}>{formatDate(member.date_of_birth)}</td>
                  <td className={profileTableCellClassName}>{member.phone_number ?? "-"}</td>
                  <td className={profileTableCellClassName}>{member.is_dependent ? "Yes" : "No"}</td>
                  <td className={profileTableActionCellClassName}>
                    {canEdit ? (
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => startEdit(member)}>
                          Edit
                        </Button>
                        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => void onDelete(member.id)}>
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
