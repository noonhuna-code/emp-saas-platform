"use client";

import { useEffect, useState } from "react";
import type { EmployeePersonalDetails, EmployeeSensitiveData } from "@/lib/types/profile";
import { StatusBadge } from "@/components/shared/StatusBadge";

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
  bank_swift: null
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
  onSave
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
      ...(sensitive ?? {})
    });
  }, [sensitive]);

  const handleSave = async () => {
    await onSave(form);
    setEditing(false);
  };

  if (!canEdit) {
    return (
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h3>Sensitive Data</h3>
            <p className="muted">Masked identifiers for employee self-view.</p>
          </div>
          <StatusBadge status="Masked" />
        </div>
        <div className="form-grid form-grid--two">
          <div className="field-readonly">
            <span>National ID</span>
            <strong>{mask(personal?.national_id_masked)}</strong>
          </div>
          <div className="field-readonly">
            <span>Passport</span>
            <strong>{mask(personal?.passport_number_masked)}</strong>
          </div>
          <div className="field-readonly">
            <span>Tax ID</span>
            <strong>{mask(personal?.tax_id_masked)}</strong>
          </div>
          <div className="field-readonly">
            <span>Bank Account</span>
            <strong>{mask(personal?.bank_account_masked)}</strong>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h3>Sensitive Data</h3>
          <p className="muted">Restricted access for HR/Admin only.</p>
        </div>
        <button className="secondary-btn" type="button" onClick={() => setEditing((prev) => !prev)}>
          {editing ? "Cancel" : "Edit"}
        </button>
      </div>

      <div className="form-grid form-grid--two">
        <label>
          National ID
          <input
            type="text"
            value={form.national_id ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, national_id: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Passport number
          <input
            type="text"
            value={form.passport_number ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, passport_number: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Passport expiry
          <input
            type="date"
            value={form.passport_expiry ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, passport_expiry: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Visa status
          <input
            type="text"
            value={form.visa_status ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, visa_status: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Tax ID
          <input
            type="text"
            value={form.tax_id ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, tax_id: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
      </div>

      <div className="form-grid form-grid--two">
        <label>
          Bank name
          <input
            type="text"
            value={form.bank_name ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, bank_name: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Bank account number
          <input
            type="text"
            value={form.bank_account_number ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, bank_account_number: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          IBAN
          <input
            type="text"
            value={form.bank_iban ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, bank_iban: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          Branch
          <input
            type="text"
            value={form.bank_branch ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, bank_branch: event.target.value || null }))}
            disabled={!editing}
          />
        </label>
        <label>
          SWIFT
          <input
            type="text"
            value={form.bank_swift ?? ""}
            onChange={(event) => setForm((prev) => ({ ...prev, bank_swift: event.target.value || null }))}
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
