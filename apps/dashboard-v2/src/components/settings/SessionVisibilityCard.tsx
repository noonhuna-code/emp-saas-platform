"use client";

import { useMemo, useState } from "react";
import {
  ProfileTablePagination,
  ProfileTableShell,
  ProfileTableToolbar,
  profileTableActionCellClassName,
  profileTableCellClassName,
  profileTableClassName,
  profileTableHeadClassName,
} from "@/components/profile/ProfileSectionPrimitives";
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

const PAGE_SIZE = 6;

export const SessionVisibilityCard = ({
  currentSessionId,
  sessions: initialSessions,
  devices: initialDevices,
}: SessionVisibilityCardProps) => {
  const [sessions, setSessions] = useState(initialSessions);
  const [devices, setDevices] = useState(initialDevices);
  const [sessionQuery, setSessionQuery] = useState("");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [sessionPage, setSessionPage] = useState(1);
  const [devicePage, setDevicePage] = useState(1);
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const hasOtherActiveSessions = sessions.some((session) => session.status === "active");

  const filteredSessions = useMemo(() => {
    const search = sessionQuery.trim().toLowerCase();
    if (!search) return sessions;
    return sessions.filter((session) =>
      `${session.status} ${session.revokedReason ?? ""} ${formatDateTime(session.createdAt)} ${formatDateTime(session.lastSeenAt)}`
        .toLowerCase()
        .includes(search)
    );
  }, [sessionQuery, sessions]);

  const filteredDevices = useMemo(() => {
    const search = deviceQuery.trim().toLowerCase();
    if (!search) return devices;
    return devices.filter((device) =>
      `${device.deviceHashMasked} ${device.riskScore} ${formatDateTime(device.firstSeenAt)} ${formatDateTime(device.lastSeenAt)}`
        .toLowerCase()
        .includes(search)
    );
  }, [deviceQuery, devices]);

  const sessionTotalPages = Math.max(1, Math.ceil(filteredSessions.length / PAGE_SIZE));
  const deviceTotalPages = Math.max(1, Math.ceil(filteredDevices.length / PAGE_SIZE));

  const visibleSessions = useMemo(() => {
    const start = (sessionPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, sessionPage]);

  const visibleDevices = useMemo(() => {
    const start = (devicePage - 1) * PAGE_SIZE;
    return filteredDevices.slice(start, start + PAGE_SIZE);
  }, [filteredDevices, devicePage]);

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
    setSessionPage(1);
    setDevicePage(1);
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
    setSessionPage(1);
    setDevicePage(1);
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
    setSessionPage(1);
    setDevicePage(1);
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
        <div className="space-y-4">
          <ProfileTableToolbar
            query={sessionQuery}
            onQueryChange={(value) => {
              setSessionQuery(value);
              setSessionPage(1);
            }}
            placeholder="Search sessions"
            countLabel={`${filteredSessions.length} sessions`}
          />
          {filteredSessions.length === 0 ? (
            <p className="text-sm text-slate-500">No tracked sessions available.</p>
          ) : (
            <>
              <ProfileTableShell>
                <table className={profileTableClassName}>
                  <thead className={profileTableHeadClassName}>
                    <tr>
                      <th className={profileTableCellClassName}>Status</th>
                      <th className={profileTableCellClassName}>Signed in</th>
                      <th className={profileTableCellClassName}>Last seen</th>
                      <th className={profileTableCellClassName}>Expires</th>
                      <th className={profileTableCellClassName}>Revocation</th>
                      <th className={profileTableActionCellClassName}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleSessions.map((session) => (
                      <tr key={session.id} className="bg-white/95">
                        <td className={profileTableCellClassName}>
                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-semibold text-slate-950">
                              {session.status === "current" ? "Current session" : "Tracked session"}
                            </span>
                            <Badge className={`w-fit rounded-full ${STATUS_STYLES[session.status]}`}>{session.status}</Badge>
                          </div>
                        </td>
                        <td className={profileTableCellClassName}>{formatDateTime(session.createdAt)}</td>
                        <td className={profileTableCellClassName}>{formatDateTime(session.lastSeenAt)}</td>
                        <td className={profileTableCellClassName}>{formatDateTime(session.expiresAt)}</td>
                        <td className={profileTableCellClassName}>
                          {session.revokedAt ? session.revokedReason ?? "Revoked" : "Not revoked"}
                        </td>
                        <td className={profileTableActionCellClassName}>
                          {session.id === currentSessionId || session.status !== "active" ? (
                            <span className="text-xs font-medium text-slate-400">No action</span>
                          ) : (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="rounded-full"
                              disabled={busySessionId === session.id}
                              onClick={() => handleRevokeSession(session.id)}
                            >
                              {busySessionId === session.id ? "Revoking..." : "Revoke"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ProfileTableShell>
              <ProfileTablePagination
                page={sessionPage}
                totalPages={sessionTotalPages}
                countLabel={`Showing ${visibleSessions.length} of ${filteredSessions.length} sessions`}
                onPrevious={() => setSessionPage((current) => Math.max(1, current - 1))}
                onNext={() => setSessionPage((current) => Math.min(sessionTotalPages, current + 1))}
              />
            </>
          )}
        </div>
      </SurfacePanel>

      <SurfacePanel title="Known devices" description="Device fingerprints recorded for this account through live login activity.">
        <div className="space-y-4">
          <ProfileTableToolbar
            query={deviceQuery}
            onQueryChange={(value) => {
              setDeviceQuery(value);
              setDevicePage(1);
            }}
            placeholder="Search devices"
            countLabel={`${filteredDevices.length} devices`}
          />
          {filteredDevices.length === 0 ? (
            <p className="text-sm text-slate-500">No device fingerprints recorded yet.</p>
          ) : (
            <>
              <ProfileTableShell>
                <table className={profileTableClassName}>
                  <thead className={profileTableHeadClassName}>
                    <tr>
                      <th className={profileTableCellClassName}>Device</th>
                      <th className={profileTableCellClassName}>First seen</th>
                      <th className={profileTableCellClassName}>Last seen</th>
                      <th className={profileTableCellClassName}>Risk</th>
                      <th className={profileTableActionCellClassName}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleDevices.map((device) => (
                      <tr key={device.id} className="bg-white/95">
                        <td className={profileTableCellClassName}>
                          <span className="font-semibold text-slate-950">{device.deviceHashMasked}</span>
                        </td>
                        <td className={profileTableCellClassName}>{formatDateTime(device.firstSeenAt)}</td>
                        <td className={profileTableCellClassName}>{formatDateTime(device.lastSeenAt)}</td>
                        <td className={profileTableCellClassName}>{device.riskScore}</td>
                        <td className={profileTableActionCellClassName}>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="rounded-full"
                            disabled={busyDeviceId === device.id}
                            onClick={() => handleForgetDevice(device.id)}
                          >
                            {busyDeviceId === device.id ? "Removing..." : "Forget device"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ProfileTableShell>
              <ProfileTablePagination
                page={devicePage}
                totalPages={deviceTotalPages}
                countLabel={`Showing ${visibleDevices.length} of ${filteredDevices.length} devices`}
                onPrevious={() => setDevicePage((current) => Math.max(1, current - 1))}
                onNext={() => setDevicePage((current) => Math.min(deviceTotalPages, current + 1))}
              />
            </>
          )}
        </div>
        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
        {success ? <p className="mt-4 text-sm font-medium text-emerald-600">{success}</p> : null}
      </SurfacePanel>
    </div>
  );
};
