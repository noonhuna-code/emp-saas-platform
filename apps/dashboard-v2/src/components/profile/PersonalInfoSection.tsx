"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { EmployeePersonalDetails } from "@/lib/types/profile";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ProfilePanel,
  ProfileSectionCard,
  ReadonlyField,
  SectionActionBar,
  profileFieldClassName,
  profileLabelClassName,
} from "@/components/profile/ProfileSectionPrimitives";

type PersonalFormState = Omit<EmployeePersonalDetails, "id" | "employee_id" | "company_id" | "created_at" | "updated_at">;

const defaultState: PersonalFormState = {
  date_of_birth: null,
  gender: null,
  marital_status: null,
  nationality: null,
  phone_number: null,
  alternate_phone: null,
  official_email: null,
  personal_email: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  emergency_contact_relationship: null,
  national_id_masked: null,
  passport_number_masked: null,
  tax_id_masked: null,
  bank_account_masked: null,
};

const isEmail = (value: string | null | undefined): boolean => {
  if (!value) return true;
  return /.+@.+\..+/.test(value);
};

export const PersonalInfoSection = ({
  details,
  canEdit,
  onSave,
}: {
  details: EmployeePersonalDetails | null;
  canEdit: boolean;
  onSave: (payload: PersonalFormState) => Promise<void>;
}) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PersonalFormState>(defaultState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      ...defaultState,
      ...(details ?? {}),
    });
  }, [details]);

  const handleSave = async () => {
    setError(null);
    if (!isEmail(form.official_email) || !isEmail(form.personal_email)) {
      setError("Enter a valid email address.");
      return;
    }
    await onSave(form);
    setEditing(false);
  };

  return (
    <ProfileSectionCard
      title="Personal information"
      description="Identity, contact, address, and emergency details used across your employee record."
      actions={
        canEdit ? (
          <Button type="button" variant="secondary" size="sm" className="rounded-full" onClick={() => setEditing((prev) => !prev)}>
            {editing ? "Cancel" : "Edit details"}
          </Button>
        ) : (
          <StatusBadge status="Read-only" />
        )
      }
    >
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <ProfilePanel title="Identity" description="Core personal identity and civil status values.">
        <div className="grid gap-4 xl:grid-cols-2">
          <label className={profileLabelClassName}>
            <span>Date of birth</span>
            <input
              className={profileFieldClassName}
              type="date"
              value={form.date_of_birth ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, date_of_birth: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Gender</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.gender ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Marital status</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.marital_status ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, marital_status: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Nationality</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.nationality ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, nationality: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
        </div>
      </ProfilePanel>

      <ProfilePanel title="Contact" description="Primary and secondary communication channels.">
        <div className="grid gap-4 xl:grid-cols-2">
          <label className={profileLabelClassName}>
            <span>Phone</span>
            <input
              className={profileFieldClassName}
              type="tel"
              value={form.phone_number ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Alternate phone</span>
            <input
              className={profileFieldClassName}
              type="tel"
              value={form.alternate_phone ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, alternate_phone: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Official email</span>
            <input
              className={profileFieldClassName}
              type="email"
              value={form.official_email ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, official_email: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Personal email</span>
            <input
              className={profileFieldClassName}
              type="email"
              value={form.personal_email ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, personal_email: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
        </div>
      </ProfilePanel>

      <ProfilePanel title="Address" description="Current residence used for payroll, compliance, and emergency records.">
        <div className="grid gap-4 xl:grid-cols-2">
          <label className={profileLabelClassName}>
            <span>Address line 1</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.address_line1 ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, address_line1: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Address line 2</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.address_line2 ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, address_line2: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>City</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.city ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>State / province</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.state ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Postal code</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.postal_code ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, postal_code: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Country</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.country ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
        </div>
      </ProfilePanel>

      <ProfilePanel title="Emergency" description="Point of contact used when urgent intervention is required.">
        <div className="grid gap-4 xl:grid-cols-3">
          <label className={profileLabelClassName}>
            <span>Contact name</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.emergency_contact_name ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, emergency_contact_name: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Contact phone</span>
            <input
              className={profileFieldClassName}
              type="tel"
              value={form.emergency_contact_phone ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, emergency_contact_phone: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
          <label className={profileLabelClassName}>
            <span>Relationship</span>
            <input
              className={profileFieldClassName}
              type="text"
              value={form.emergency_contact_relationship ?? ""}
              onChange={(event) => setForm((prev) => ({ ...prev, emergency_contact_relationship: event.target.value || null }))}
              disabled={!editing}
            />
          </label>
        </div>
      </ProfilePanel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ReadonlyField label="National ID" value={details?.national_id_masked ?? "—"} hint="Masked for self-service view" />
        <ReadonlyField label="Passport" value={details?.passport_number_masked ?? "—"} hint="Masked for privacy" />
        <ReadonlyField label="Tax ID" value={details?.tax_id_masked ?? "—"} hint="Masked for privacy" />
        <ReadonlyField label="Bank account" value={details?.bank_account_masked ?? "—"} hint="Masked for privacy" />
      </div>

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
