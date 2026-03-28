"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";
import { changePassword } from "@/lib/client/api";

const INPUT_CLASSNAME =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100";

export const PasswordChangeCard = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All password fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match.");
      return;
    }

    setSubmitting(true);
    const result = await changePassword({ currentPassword, newPassword, confirmPassword });
    setSubmitting(false);

    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to update password.");
      return;
    }

    const successPayload = result.data;

    setSuccess(successPayload.message);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    window.setTimeout(() => {
      window.location.assign(successPayload.redirectTo);
    }, 900);
  };

  return (
    <SurfacePanel
      title="Password and session security"
      description="Update your password here. On success, EMP will sign you out and require a fresh login across active sessions."
      tone="spotlight"
    >
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-2 md:col-span-2">
          <span className="text-sm font-medium text-slate-700">Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            className={INPUT_CLASSNAME}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">New password</span>
          <input
            type="password"
            autoComplete="new-password"
            className={INPUT_CLASSNAME}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700">Confirm new password</span>
          <input
            type="password"
            autoComplete="new-password"
            className={INPUT_CLASSNAME}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Updating password..." : "Change password"}
          </Button>
          <p className="text-sm text-slate-500">Use at least 8 characters and avoid reusing your current password.</p>
        </div>

        {error ? <p className="md:col-span-2 text-sm font-medium text-red-600">{error}</p> : null}
        {success ? <p className="md:col-span-2 text-sm font-medium text-emerald-600">{success}</p> : null}
      </form>
    </SurfacePanel>
  );
};
