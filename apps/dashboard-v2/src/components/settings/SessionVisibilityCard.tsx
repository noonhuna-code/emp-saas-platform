"use client";

import { useState } from "react";
import { SurfacePanel } from "@/components/dashboard-v2/PagePrimitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { forgetSettingsDevice, revokeOtherSettingsSessions, revokeSettingsSession } from "@/lib/client/api";
import type { SettingsDeviceSnapshot, SettingsSessionSnapshot } from "@emp/services/settings.service";

type SessionVisibilityCardProps = {
  currentSessionId: string | null;
  sessions: SettingsSessionSnapshot[];
  devices: SettingsDeviceSnapshot[];
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const STATUS_STYLES: Record<SettingsSessionSnapshot["status"], string> = {
  current: "border-emerald-200 bg-emerald-50 text-emerald-700",
  active: "border-blue-200 bg-blue-50 text-blue-700",
  expired: "border-amber-200 bg-amber-50 text-amber-700",
  revoked: "border-slate-200 bg-slate-100 text-slate-700",
};

export const SessionVisibilityCard = ({
  currentSessionId,
  sessions: initialSessions,
  devices: initialDevices,
}: SessionVisibilityCardProps) => {
  const [sessions, setSessions] = useState(initialSessions);
  const [devices, setDevices] = useState(initialDevices);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasOtherActiveSessions = sessions.some((session) => session.status === "active");

  const handleRevokeSession = async (sessionId: string) => {
    setBusySessionId(sessionId);
    setError(null);
    setSuccess(null);

    const result = await revokeSettingsSession(sessionId);
    setBusySessionId(null);

    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to revoke session.");
      return;
    }

    setSessions(result.data.sessions);
    setDevices(result.data.devices);
    setSuccess("Session revoked.");
  };

  const handleRevokeOthers = async () => {
    setBusySessionId("__others__");
    setError(null);
    setSuccess(null);

    const result = await revokeOtherSettingsSessions();
    setBusySessionId(null);

    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to revoke other sessions.");
      return;
    }

    setSessions(result.data.sessions);
    setDevices(result.data.devices);
    setSuccess("Other active sessions were revoked.");
  };

  const handleForgetDevice = async (deviceId: string) => {
    setBusyDeviceId(deviceId);
    setError(null);
    setSuccess(null);

    const result = await forgetSettingsDevice(deviceId);
    setBusyDeviceId(null);

    if (!result.ok || !result.data) {
      setError(result.error ?? "Unable to forget device.");
      return;
    }

    setSessions(result.data.sessions);
    setDevices(result.data.devices);
    setSuccess("Device removed from the known-device list.");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
      <SurfacePanel title="Active sessions" description="Current and recent authenticated sessions for this account.">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Badge className="rounded-full border-slate-200 bg-slate-100 text-slate-700">
            {sessions.filter((session) => session.status === "active" || session.status === "current").length} active sessions
          </Badge>
          <Button type="button" variant="secondary" disabled={!hasOtherActiveSessions || busySessionId === "__others__"} onClick={handleRevokeOthers}>
            {busySessionId === "__others__" ? "Revoking..." : "Sign out other sessions"}
          </Button>
        </div>
        <div className="grid gap-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-500">No tracked sessions available.</p>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="rounded-[20px] border border-slate-200/80 bg-white/92 px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-950">{session.status === "current" ? "Current session" : "Tracked session"}</p>
                    <Badge className={`rounded-full ${STATUS_STYLES[session.status]}`}>{session.status}</Badge>
                  </div>
                  {session.id === currentSessionId || session.status !== "active" ? null : (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={busySessionId === session.id}
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      {busySessionId === session.id ? "Revoking..." : "Revoke"}
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <p>Signed in: {formatDateTime(session.createdAt)}</p>
                  <p>Last seen: {formatDateTime(session.lastSeenAt)}</p>
                  <p>Expires: {formatDateTime(session.expiresAt)}</p>
                  <p>Revocation: {session.revokedAt ? session.revokedReason ?? "Revoked" : "Not revoked"}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SurfacePanel>

      <SurfacePanel title="Known devices" description="Device fingerprints recorded for this account through live login activity.">
        <div className="grid gap-3">
          {devices.length === 0 ? (
            <p className="text-sm text-slate-500">No device fingerprints recorded yet.</p>
          ) : (
            devices.map((device) => (
              <div key={device.id} className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">{device.deviceHashMasked}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busyDeviceId === device.id}
                    onClick={() => handleForgetDevice(device.id)}
                  >
                    {busyDeviceId === device.id ? "Removing..." : "Forget device"}
                  </Button>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-slate-600">
                  <p>First seen: {formatDateTime(device.firstSeenAt)}</p>
                  <p>Last seen: {formatDateTime(device.lastSeenAt)}</p>
                  <p>Risk score: {device.riskScore}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm font-medium text-emerald-600">{success}</p> : null}
      </SurfacePanel>
    </div>
  );
};
