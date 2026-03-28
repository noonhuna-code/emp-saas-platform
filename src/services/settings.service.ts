import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { listWorkspaceNotifications, type WorkspaceNotificationRow } from "./employee-workspace.service";
import { upsertEmployeePersonalDetails } from "./employee.service";
import { assertEmployeeReadAccess } from "./access-scope.service";

export type SettingsAccountSnapshot = {
  employeeId: string | null;
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

export type SettingsSessionSnapshot = {
  id: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  status: "current" | "active" | "expired" | "revoked";
};

export type SettingsDeviceSnapshot = {
  id: string;
  deviceHashMasked: string;
  firstSeenAt: string;
  lastSeenAt: string;
  riskScore: number;
};

export type SettingsNotificationSnapshot = {
  enabled: boolean;
  unreadCount: number;
  recent: WorkspaceNotificationRow[];
  deliveryNote: string;
};

export type SettingsWorkspaceSnapshot = {
  account: SettingsAccountSnapshot;
  sessions: SettingsSessionSnapshot[];
  devices: SettingsDeviceSnapshot[];
  notifications: SettingsNotificationSnapshot;
};

export type SettingsAccountInput = {
  fullName?: string | null;
  avatarUrl?: string | null;
  phoneNumber?: string | null;
  alternatePhone?: string | null;
  personalEmail?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelationship?: string | null;
};

type SettingsWorkspaceLists = Pick<SettingsWorkspaceSnapshot, "sessions" | "devices">;

const SETTINGS_AVATAR_BUCKET = "employee-documents";
const SETTINGS_AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const SETTINGS_AVATAR_ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

const getEnv = (key: string): string => process.env[key] ?? "";

const createSupabaseAdminClient = (): SupabaseClient => {
  const url = getEnv("SUPABASE_URL") || getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const sanitizeText = (value?: string | null): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
};

export const buildSettingsAvatarProxyUrl = (profileId: string, versionToken?: string | null): string => {
  const suffix = versionToken ? `?v=${encodeURIComponent(versionToken)}` : "";
  return `/api/settings/avatar/${encodeURIComponent(profileId)}${suffix}`;
};

const buildAvatarStoragePath = (companyId: string, profileId: string): string =>
  `${companyId}/avatars/${profileId}/avatar`;

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && data) return data as string;
  } catch {
    // fallback below
  }

  const { data } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return (data?.id as string | undefined) ?? null;
};

const maskDeviceHash = (value: string): string => {
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const buildSessionStatus = (
  row: { id: string; expires_at: string; revoked_at?: string | null },
  currentSessionId: string | null
): SettingsSessionSnapshot["status"] => {
  if (row.revoked_at) return "revoked";
  if (row.expires_at <= new Date().toISOString()) return "expired";
  if (currentSessionId && row.id === currentSessionId) return "current";
  return "active";
};

const readAccountSnapshot = async (ctx: ServiceContext): Promise<SettingsAccountSnapshot> => {
  const employeeId = await resolveCurrentEmployeeId(ctx);

  const [profileResult, personalResult] = await Promise.all([
    ctx.supabase
      .from("user_profiles")
      .select("full_name, avatar_url")
      .eq("id", ctx.userProfileId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle(),
    employeeId
      ? ctx.supabase
          .from("employee_personal_details")
          .select(
            "official_email, personal_email, phone_number, alternate_phone, address_line1, address_line2, city, state, postal_code, country, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship"
          )
          .eq("company_id", ctx.companyId)
          .eq("employee_id", employeeId)
          .is("is_deleted", false)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  return {
    employeeId,
    fullName: (profileResult.data?.full_name as string | null) ?? null,
    avatarUrl: (profileResult.data?.avatar_url as string | null) ?? null,
    officialEmail: (personalResult.data?.official_email as string | null) ?? null,
    personalEmail: (personalResult.data?.personal_email as string | null) ?? null,
    phoneNumber: (personalResult.data?.phone_number as string | null) ?? null,
    alternatePhone: (personalResult.data?.alternate_phone as string | null) ?? null,
    addressLine1: (personalResult.data?.address_line1 as string | null) ?? null,
    addressLine2: (personalResult.data?.address_line2 as string | null) ?? null,
    city: (personalResult.data?.city as string | null) ?? null,
    state: (personalResult.data?.state as string | null) ?? null,
    postalCode: (personalResult.data?.postal_code as string | null) ?? null,
    country: (personalResult.data?.country as string | null) ?? null,
    emergencyContactName: (personalResult.data?.emergency_contact_name as string | null) ?? null,
    emergencyContactPhone: (personalResult.data?.emergency_contact_phone as string | null) ?? null,
    emergencyContactRelationship: (personalResult.data?.emergency_contact_relationship as string | null) ?? null,
  };
};

const readNotificationSnapshot = async (ctx: ServiceContext): Promise<SettingsNotificationSnapshot> => {
  const result = await listWorkspaceNotifications(ctx, { limit: 5 });
  if (!result.ok || !result.data) {
    return {
      enabled: false,
      unreadCount: 0,
      recent: [],
      deliveryNote: "In-app notification delivery is not enabled for this tenant or role in the current backend.",
    };
  }

  const unreadCount = result.data.rows.filter((row) => !row.is_read).length;
  return {
    enabled: true,
    unreadCount,
    recent: result.data.rows,
    deliveryNote:
      "EMP currently delivers notifications in-app based on your role, approvals, and workspace events. Channel-level preference persistence is not configured in the current backend.",
  };
};

const readSessionAndDeviceSnapshot = async (
  ctx: ServiceContext,
  currentSessionId: string | null
): Promise<SettingsWorkspaceLists> => {
  const [sessionsResult, devicesResult] = await Promise.all([
    ctx.supabase
      .from("auth_sessions")
      .select("id, created_at, last_seen_at, expires_at, revoked_at, revoked_reason")
      .eq("company_id", ctx.companyId)
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .limit(8),
    ctx.supabase
      .from("device_fingerprints")
      .select("id, device_hash, first_seen_at, last_seen_at, risk_score")
      .eq("company_id", ctx.companyId)
      .eq("profile_id", ctx.userProfileId)
      .eq("is_deleted", false)
      .order("last_seen_at", { ascending: false })
      .limit(8),
  ]);

  return {
    sessions: (sessionsResult.data ?? []).map((row) => ({
      id: row.id as string,
      createdAt: row.created_at as string,
      lastSeenAt: row.last_seen_at as string,
      expiresAt: row.expires_at as string,
      revokedAt: (row.revoked_at as string | null) ?? null,
      revokedReason: (row.revoked_reason as string | null) ?? null,
      status: buildSessionStatus(
        {
          id: row.id as string,
          expires_at: row.expires_at as string,
          revoked_at: (row.revoked_at as string | null) ?? null,
        },
        currentSessionId
      ),
    })),
    devices: (devicesResult.data ?? []).map((row) => ({
      id: row.id as string,
      deviceHashMasked: maskDeviceHash(row.device_hash as string),
      firstSeenAt: row.first_seen_at as string,
      lastSeenAt: row.last_seen_at as string,
      riskScore: Number(row.risk_score ?? 0),
    })),
  };
};

export const getSettingsWorkspaceSnapshot = async (
  ctx: ServiceContext,
  currentSessionId: string | null
): Promise<ServiceResult<SettingsWorkspaceSnapshot>> => {
  try {
    const [account, sessionAndDeviceSnapshot, notifications] = await Promise.all([
      readAccountSnapshot(ctx),
      readSessionAndDeviceSnapshot(ctx, currentSessionId),
      readNotificationSnapshot(ctx),
    ]);

    return {
      ok: true,
      data: {
        account,
        sessions: sessionAndDeviceSnapshot.sessions,
        devices: sessionAndDeviceSnapshot.devices,
        notifications,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load settings workspace",
    };
  }
};

export const updateSettingsAccount = async (
  ctx: ServiceContext,
  payload: SettingsAccountInput
): Promise<ServiceResult<SettingsAccountSnapshot>> => {
  try {
    const admin = createSupabaseAdminClient();
    const employeeId = await resolveCurrentEmployeeId(ctx);

    const userProfilePatch = {
      full_name: sanitizeText(payload.fullName),
      avatar_url: sanitizeText(payload.avatarUrl),
      updated_at: new Date().toISOString(),
      updated_by: ctx.userProfileId,
    };

    const { error: profileError } = await admin
      .from("user_profiles")
      .update(userProfilePatch)
      .eq("id", ctx.userProfileId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    if (employeeId) {
      const personalResult = await upsertEmployeePersonalDetails(ctx, employeeId, {
        phone_number: sanitizeText(payload.phoneNumber),
        alternate_phone: sanitizeText(payload.alternatePhone),
        personal_email: sanitizeText(payload.personalEmail),
        address_line1: sanitizeText(payload.addressLine1),
        address_line2: sanitizeText(payload.addressLine2),
        city: sanitizeText(payload.city),
        state: sanitizeText(payload.state),
        postal_code: sanitizeText(payload.postalCode),
        country: sanitizeText(payload.country),
        emergency_contact_name: sanitizeText(payload.emergencyContactName),
        emergency_contact_phone: sanitizeText(payload.emergencyContactPhone),
        emergency_contact_relationship: sanitizeText(payload.emergencyContactRelationship),
      });

      if (!personalResult.ok) {
        return { ok: false, error: personalResult.error ?? "Unable to update account settings" };
      }
    }

    const account = await readAccountSnapshot(ctx);
    return { ok: true, data: account };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update account settings",
    };
  }
};

export const uploadSettingsAvatar = async (
  ctx: ServiceContext,
  file: File
): Promise<ServiceResult<SettingsAccountSnapshot>> => {
  try {
    if (!(file instanceof File) || !file.name) {
      return { ok: false, error: "Avatar file is required" };
    }

    if (!SETTINGS_AVATAR_ALLOWED_TYPES.has(file.type)) {
      return { ok: false, error: "Supported avatar types are PNG, JPG, WEBP, and GIF" };
    }

    if (file.size <= 0 || file.size > SETTINGS_AVATAR_MAX_SIZE_BYTES) {
      return { ok: false, error: "Avatar size must be 5 MB or less" };
    }

    const admin = createSupabaseAdminClient();
    const employeeId = await resolveCurrentEmployeeId(ctx);
    const storagePath = buildAvatarStoragePath(ctx.companyId, ctx.userProfileId);
    const versionToken = new Date().toISOString();
    const avatarProxyUrl = buildSettingsAvatarProxyUrl(ctx.userProfileId, versionToken);

    const { error: uploadError } = await admin.storage
      .from(SETTINGS_AVATAR_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      return { ok: false, error: "Unable to upload avatar" };
    }

    const { error: profileError } = await admin
      .from("user_profiles")
      .update({
        avatar_url: avatarProxyUrl,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userProfileId,
      })
      .eq("id", ctx.userProfileId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    if (employeeId) {
      await admin
        .from("employees")
        .update({
          profile_image_url: avatarProxyUrl,
          updated_at: new Date().toISOString(),
          updated_by: ctx.userProfileId,
        })
        .eq("id", employeeId)
        .eq("company_id", ctx.companyId)
        .is("is_deleted", false);
    }

    const account = await readAccountSnapshot(ctx);
    return { ok: true, data: account };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to upload avatar",
    };
  }
};

export const createSettingsAvatarDownloadUrl = async (
  ctx: ServiceContext,
  profileId: string
): Promise<ServiceResult<{ url: string; expiresAt: string }>> => {
  try {
    const admin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await ctx.supabase
      .from("user_profiles")
      .select("id, company_id")
      .eq("id", profileId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (profileError || !profile?.id) {
      return { ok: false, error: "Avatar not found" };
    }

    if (profileId !== ctx.userProfileId) {
      const { data: employee, error: employeeError } = await ctx.supabase
        .from("employees")
        .select("id")
        .eq("company_id", ctx.companyId)
        .eq("user_profile_id", profileId)
        .is("is_deleted", false)
        .maybeSingle();

      if (employeeError) {
        return { ok: false, error: employeeError.message };
      }

      if (employee?.id) {
        await assertEmployeeReadAccess(ctx, employee.id as string);
      } else if (!ctx.permissions.includes("manage_company") && !ctx.permissions.includes("manage_employees")) {
        return { ok: false, error: "Permission denied" };
      }
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(SETTINGS_AVATAR_BUCKET)
      .createSignedUrl(buildAvatarStoragePath(ctx.companyId, profileId), 60 * 15);

    if (signedError || !signed?.signedUrl) {
      return { ok: false, error: "Avatar unavailable" };
    }

    return {
      ok: true,
      data: {
        url: signed.signedUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load avatar",
    };
  }
};

export const revokeSettingsSession = async (
  ctx: ServiceContext,
  sessionId: string,
  currentSessionId: string | null
): Promise<ServiceResult<SettingsWorkspaceLists>> => {
  try {
    if (!sessionId) {
      return { ok: false, error: "Session id required" };
    }

    if (currentSessionId && sessionId === currentSessionId) {
      return { ok: false, error: "Use sign out for the current session" };
    }

    const { error } = await ctx.supabase
      .from("auth_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: "user_revoked_from_settings",
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("company_id", ctx.companyId)
      .eq("user_id", ctx.userId)
      .is("revoked_at", null);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: await readSessionAndDeviceSnapshot(ctx, currentSessionId) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to revoke session",
    };
  }
};

export const revokeOtherSettingsSessions = async (
  ctx: ServiceContext,
  currentSessionId: string | null
): Promise<ServiceResult<SettingsWorkspaceLists>> => {
  try {
    let query = ctx.supabase
      .from("auth_sessions")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: "user_revoked_other_sessions",
        last_seen_at: new Date().toISOString(),
      })
      .eq("company_id", ctx.companyId)
      .eq("user_id", ctx.userId)
      .is("revoked_at", null);

    if (currentSessionId) {
      query = query.neq("id", currentSessionId);
    }

    const { error } = await query;

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: await readSessionAndDeviceSnapshot(ctx, currentSessionId) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to revoke sessions",
    };
  }
};

export const forgetSettingsDevice = async (
  ctx: ServiceContext,
  deviceId: string,
  currentSessionId: string | null
): Promise<ServiceResult<SettingsWorkspaceLists>> => {
  try {
    if (!deviceId) {
      return { ok: false, error: "Device id required" };
    }

    const { error } = await ctx.supabase
      .from("device_fingerprints")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: ctx.userProfileId,
      })
      .eq("id", deviceId)
      .eq("company_id", ctx.companyId)
      .eq("profile_id", ctx.userProfileId)
      .eq("is_deleted", false);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data: await readSessionAndDeviceSnapshot(ctx, currentSessionId) };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to forget device",
    };
  }
};
