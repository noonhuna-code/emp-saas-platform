"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";
import { Avatar } from "@/components/shared/Avatar";
import { updateSettingsAccount, uploadSettingsAvatar } from "@/lib/client/api";

type AccountSettingsCardProps = {
  initial: {
    fullName: string | null;
    avatarUrl: string | null;
    officialEmail: string | null;
    personalEmail: string | null;
    phoneNumber: string | null;
    alternatePhone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    emergencyContactRelationship: string | null;
  };
};

const INPUT_CLASSNAME =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

export const AccountSettingsCard = ({ initial }: AccountSettingsCardProps) => {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const applyAccountState = (next: typeof initial) => {
    setForm({
      fullName: next.fullName,
      avatarUrl: next.avatarUrl,
      officialEmail: next.officialEmail,
      personalEmail: next.personalEmail,
      phoneNumber: next.phoneNumber,
      alternatePhone: next.alternatePhone,
      addressLine1: next.addressLine1,
      addressLine2: next.addressLine2,
      city: next.city,
      state: next.state,
      postalCode: next.postalCode,
      country: next.country,
      emergencyContactName: next.emergencyContactName,
      emergencyContactPhone: next.emergencyContactPhone,
      emergencyContactRelationship: next.emergencyContactRelationship,
    });
  };

  const updateField = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value || null }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateSettingsAccount(form);
    setSaving(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to save account settings.");
      return;
    }

    applyAccountState(result.data);
    setSuccess("Account settings saved.");
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    setSuccess(null);

    const result = await uploadSettingsAvatar(file);
    setUploadingAvatar(false);
    event.target.value = "";

    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to upload avatar.");
      return;
    }

    applyAccountState(result.data);
    setSuccess("Profile photo updated.");
  };

  return (
    <SurfacePanel
      title="Account and contact settings"
      description="Use settings for the self-service account details people actually change often: display identity, profile photo, contact methods, and emergency details."
      tone="spotlight"
    >
      <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
        <div className="lg:col-span-2 rounded-[24px] border border-slate-200/80 bg-white/92 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar name={form.fullName ?? form.officialEmail ?? "Workspace user"} url={form.avatarUrl} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-950">Profile photo</p>
                <p className="text-sm leading-6 text-slate-600">
                  Upload a real avatar image for the dashboard shell and profile surfaces. Supported types: PNG, JPG, WEBP, GIF.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button type="button" variant="secondary" disabled={uploadingAvatar} onClick={() => fileInputRef.current?.click()}>
                {uploadingAvatar ? "Uploading..." : "Upload photo"}
              </Button>
            </div>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Display name</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.fullName ?? ""}
            onChange={(event) => updateField("fullName", event.target.value)}
            placeholder="Full name"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Work email</span>
          <input className={`${INPUT_CLASSNAME} bg-slate-50 text-slate-500`} value={form.officialEmail ?? ""} readOnly />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Personal email</span>
          <input
            className={INPUT_CLASSNAME}
            type="email"
            value={form.personalEmail ?? ""}
            onChange={(event) => updateField("personalEmail", event.target.value)}
            placeholder="name@example.com"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Phone number</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.phoneNumber ?? ""}
            onChange={(event) => updateField("phoneNumber", event.target.value)}
            placeholder="+92..."
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Alternate phone</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.alternatePhone ?? ""}
            onChange={(event) => updateField("alternatePhone", event.target.value)}
            placeholder="+92..."
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Address line 1</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.addressLine1 ?? ""}
            onChange={(event) => updateField("addressLine1", event.target.value)}
            placeholder="Street address"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Address line 2</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.addressLine2 ?? ""}
            onChange={(event) => updateField("addressLine2", event.target.value)}
            placeholder="Apartment, floor, or area"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">City</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.city ?? ""}
            onChange={(event) => updateField("city", event.target.value)}
            placeholder="Lahore"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">State / province</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.state ?? ""}
            onChange={(event) => updateField("state", event.target.value)}
            placeholder="Punjab"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Postal code</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.postalCode ?? ""}
            onChange={(event) => updateField("postalCode", event.target.value)}
            placeholder="54000"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Country</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.country ?? ""}
            onChange={(event) => updateField("country", event.target.value)}
            placeholder="Pakistan"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Emergency contact name</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.emergencyContactName ?? ""}
            onChange={(event) => updateField("emergencyContactName", event.target.value)}
            placeholder="Emergency contact"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Emergency contact phone</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.emergencyContactPhone ?? ""}
            onChange={(event) => updateField("emergencyContactPhone", event.target.value)}
            placeholder="+92..."
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Emergency relationship</span>
          <input
            className={INPUT_CLASSNAME}
            value={form.emergencyContactRelationship ?? ""}
            onChange={(event) => updateField("emergencyContactRelationship", event.target.value)}
            placeholder="Sibling, parent, spouse"
          />
        </label>

        <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving || uploadingAvatar}>
            {saving ? "Saving..." : "Save account settings"}
          </Button>
          <p className="text-sm text-slate-500">These values update your self-service account profile without opening the full employee workspace.</p>
        </div>

        {error ? <p className="lg:col-span-2 text-sm font-medium text-red-600">{error}</p> : null}
        {success ? <p className="lg:col-span-2 text-sm font-medium text-emerald-600">{success}</p> : null}
      </form>
    </SurfacePanel>
  );
};
