"use client";

import { useEffect, useState } from "react";
import type { EmployeePersonalDetails } from "@/lib/types/profile";
import { StatusBadge } from "@/components/shared/StatusBadge";

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
  bank_account_masked: null
};

const isEmail = (value: string | null | undefined): boolean => {
  if (!value) return true;
  return /.+@.+\..+/.test(value);
};

export const PersonalInfoSection = ({
  details,
  canEdit,
  onSave
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
      ...(details ?? {})
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
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h3>Personal Info</h3>
          <p className="muted">Identity, contact, and emergency details.</p>
        </div>
        {canEdit ? (
          <button className="secondary-btn" type="button" onClick={() => setEditing((prev) => !prev)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        ) : (
          <StatusBadge status="Read-only" />
        )}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="form-grid form-grid--two">
        <label>
          Date of birth
          <input
            type="date"
            value={form.date_of_birth ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, date_of_birth: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Gender
          <input
            type="text"
            value={form.gender ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Marital status
          <input
            type="text"
            value={form.marital_status ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, marital_status: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Nationality
          <input
            type="text"
            value={form.nationality ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, nationality: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            value={form.phone_number ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, phone_number: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Alternate phone
          <input
            type="tel"
            value={form.alternate_phone ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, alternate_phone: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Official email
          <input
            type="email"
            value={form.official_email ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, official_email: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Personal email
          <input
            type="email"
            value={form.personal_email ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, personal_email: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
      </div>

      <div className="form-grid form-grid--two">
        <label>
          Address line 1
          <input
            type="text"
            value={form.address_line1 ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, address_line1: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Address line 2
          <input
            type="text"
            value={form.address_line2 ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, address_line2: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          City
          <input
            type="text"
            value={form.city ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          State
          <input
            type="text"
            value={form.state ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Postal code
          <input
            type="text"
            value={form.postal_code ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, postal_code: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Country
          <input
            type="text"
            value={form.country ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
      </div>

      <div className="form-grid form-grid--two">
        <label>
          Emergency contact name
          <input
            type="text"
            value={form.emergency_contact_name ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, emergency_contact_name: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Emergency contact phone
          <input
            type="tel"
            value={form.emergency_contact_phone ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, emergency_contact_phone: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Emergency relationship
          <input
            type="text"
            value={form.emergency_contact_relationship ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, emergency_contact_relationship: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
      </div>

      {editing ? (
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button className="primary-btn" type="button" onClick={handleSave}>Save changes</button>
        </div>
      ) : null}
    </section>
  );
};
