"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EmployeePersonalDetails, EmployeeSensitiveData } from "@/lib/types/profile";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ProfilePanel,
  ProfileSectionCard,
  ReadonlyField,
  SectionActionBar,
  profileFieldClassName,
  profileLabelClassName,
} from "@/components/profile/ProfileSectionPrimitives";

type SensitiveFormState = Omit<EmployeeSensitiveData, "id" | "employee_id" | "company_id" | "created_at" | "updated_at">;

const defaultState: SensitiveFormState = {
  national_id: null,
  passport_number: null,
  passport_expiry: null,
  visa_status: null,
  tax_id: null,
  bank_name: null,
  bank_account_number: null,
  bank_iban: null,
  bank_branch: null,
  bank_swift: null,
};

const mask = (value?: string | null): string => {
  if (!value) return "—";
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "•".repeat(trimmed.length);
  return `${"•".repeat(trimmed.length - 4)}${trimmed.slice(-4)}`;
};

export const SensitiveDataSection = ({
  sensitive,
  personal,
  canEdit,
  onSave,
}: {
  sensitive: EmployeeSensitiveData | null;
  personal: EmployeePersonalDetails | null;
  canEdit: boolean;
  onSave: (payload: SensitiveFormState) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<SensitiveFormState>(defaultState);

  useEffect(() => {
    setForm({
      ...defaultState,
      ...(sensitive ?? {}),
    });
  }, [sensitive]);

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  if (!canEdit) {
    return (
      <ProfileSectionCard
        title="Sensitive data"
        description="Masked identity and banking references available for self-service verification only."
        actions={<StatusBadge status="Masked" />}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReadonlyField label="National ID" value={mask(personal?.national_id_masked)} hint="Masked for employee view" />
          <ReadonlyField label="Passport" value={mask(personal?.passport_number_masked)} hint="Masked for employee view" />
          <ReadonlyField label="Tax ID" value={mask(personal?.tax_id_masked)} hint="Masked for employee view" />
          <ReadonlyField label="Bank account" value={mask(personal?.bank_account_masked)} hint="Masked for employee view" />
        </div>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard
      title="Sensitive data"
      description="Restricted identity and payroll-linked information for HR and approved administrators."
      actions={
        <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setEditing((prev) => !prev)}>
          {editing ? "Cancel" : "Edit secure data"}
        </Button>
      }
    >
      <ProfilePanel title="Identity documents" description="National identity, passport, and visa information.">
        <div className="grid gap-4 xl:grid-cols-2">
          <label className={profileLabelClassName}>
            <span>National ID</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.national_id ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, national_id: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Passport number</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.passport_number ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, passport_number: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Passport expiry</span>
            <input
              className={profileFieldClassName}
              type="date"
              value={form.passport_expiry ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, passport_expiry: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Visa status</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.visa_status ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, visa_status: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Tax ID</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.tax_id ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, tax_id: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
        </div>
      </ProfilePanel>

      <ProfilePanel title="Banking" description="Payroll disbursement details and banking references.">
        <div className="grid gap-4 xl:grid-cols-2">
          <label className={profileLabelClassName}>
            <span>Bank name</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.bank_name ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, bank_name: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Account number</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.bank_account_number ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, bank_account_number: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>IBAN</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.bank_iban ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, bank_iban: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Branch</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.bank_branch ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, bank_branch: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>SWIFT</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.bank_swift ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, bank_swift: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
        </div>
      </ProfilePanel>

      {editing ? (
        <SectionActionBar>
          <Button type="button" className="rounded-full px-5" onClick={handleSave}>
            Save changes
          </Button>
        </SectionActionBar>
      ) : null}
    </ProfileSectionCard>
  );
};
