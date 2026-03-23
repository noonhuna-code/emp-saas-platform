import { cookies } from "next/headers";
import type { AuthContext } from "@emp/lib/types";
import { createUserScopedSupabaseServerClient } from "./supabase-server";

export type DashboardServerSession = {
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  userId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  shiftHours: number | null;
  companyId: string | null;
  userProfileId: string | null;
  employeeId: string | null;
  employeeCode?: string | null;
  role: string | null;
  permissions: string[];
};

type UserRoleRow = {
  role_id: string;
  company_id: string;
};

type RoleRow = {
  id: string;
  name: string;
  is_system_role: boolean | null;
};

type RolePermissionRow = {
  role_id: string;
  permission_id: string;
};

type PermissionRow = {
  id: string;
  key: string;
};

const ROLE_PRIORITY = [
  ["platform owner", "platform_owner", "platform admin", "platform_admin", "super admin", "super_admin"],
  ["founder", "ceo", "founder_ceo", "ceo_founder"],
  ["admin", "org owner", "org_owner"],
  ["hr"],
  ["finance manager", "finance", "finance_admin", "finance_lead"],
  ["it", "it_manager", "it_admin", "it_support"],
  ["director", "senior manager", "manager", "supervisor"],
  ["team lead", "team_lead", "teamlead"],
  ["employee"]
] as const;
const SESSION_COOKIE_NAME = "lf_session_id";
const SESSION_IDLE_MINUTES = 30;
const SESSION_MAX_AGE_HOURS = 24;
const SESSION_TOUCH_MINUTES = 5;

const normalizeRoleName = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");
};

const uniqueStrings = (values: Array<string | null | undefined>): string[] => {
  return Array.from(new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0)));
};

const selectPrimaryRole = (roles: RoleRow[]): string | null => {
  if (roles.length === 0) return null;

  const rank = (name: string): number => {
    const normalizedName = normalizeRoleName(name);
    const index = ROLE_PRIORITY.findIndex((aliases) => aliases.some((value) => normalizeRoleName(value) === normalizedName));
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
  };

  const sorted = [...roles].sort((a, b) => {
    const aRank = rank(a.name);
    const bRank = rank(b.name);
    if (aRank !== bRank) return aRank - bRank;
    if (Boolean(a.is_system_role) !== Boolean(b.is_system_role)) {
      return a.is_system_role ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  return sorted[0]?.name ?? null;
};

const resolveUserProfile = async (
  accessToken: string
): Promise<{
  userId: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  companyId: string;
  userProfileId: string;
  userUpdatedAt: string | null;
} | null> => {
  const supabase = createUserScopedSupabaseServerClient(accessToken);
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user?.id) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, company_id, full_name, avatar_url")
    .eq("user_id", userData.user.id)
    .is("is_deleted", false)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile?.id || !profile.company_id) {
    return null;
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? null,
    fullName: profile.full_name ?? null,
    avatarUrl: profile.avatar_url ?? null,
    companyId: profile.company_id,
    userProfileId: profile.id,
    userUpdatedAt: userData.user.updated_at ?? null
  };
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseTimeToMinutes = (value?: string | null): number | null => {
  if (!value) return null;
  const [hourRaw, minuteRaw] = value.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
};

const computeShiftHours = (start?: string | null, end?: string | null): number | null => {
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);
  if (startMinutes === null || endMinutes === null) return null;
  const totalMinutes = endMinutes >= startMinutes ? endMinutes - startMinutes : 24 * 60 - startMinutes + endMinutes;
  if (totalMinutes <= 0) return null;
  return Math.round((totalMinutes / 60) * 10) / 10;
};

const revokeSession = async (
  accessToken: string,
  sessionId: string,
  identity: { userId: string; companyId: string },
  reason: string
): Promise<void> => {
  const supabase = createUserScopedSupabaseServerClient(accessToken);
  await supabase
    .from("auth_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
      last_seen_at: new Date().toISOString()
    })
    .eq("id", sessionId)
    .eq("company_id", identity.companyId)
    .eq("user_id", identity.userId)
    .is("revoked_at", null);
};

const validateAuthSession = async (
  accessToken: string,
  sessionId: string | null,
  identity: { userId: string; companyId: string; userUpdatedAt: string | null }
): Promise<boolean> => {
  if (!sessionId) return false;

  const supabase = createUserScopedSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("id, created_at, last_seen_at, expires_at, revoked_at")
    .eq("id", sessionId)
    .eq("company_id", identity.companyId)
    .eq("user_id", identity.userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  if (data.revoked_at) {
    return false;
  }

  const now = new Date();
  const createdAt = parseDate(data.created_at);
  const lastSeenAt = parseDate(data.last_seen_at);
  const expiresAt = parseDate(data.expires_at);
  const userUpdatedAt = parseDate(identity.userUpdatedAt);

  if (!createdAt || !lastSeenAt || !expiresAt) {
    await revokeSession(accessToken, sessionId, identity, "invalid_session");
    return false;
  }

  if (expiresAt <= now) {
    await revokeSession(accessToken, sessionId, identity, "expired");
    return false;
  }

  if (now.getTime() - lastSeenAt.getTime() > SESSION_IDLE_MINUTES * 60 * 1000) {
    await revokeSession(accessToken, sessionId, identity, "idle_timeout");
    return false;
  }

  if (userUpdatedAt && userUpdatedAt > createdAt) {
    await revokeSession(accessToken, sessionId, identity, "password_changed");
    return false;
  }

  if (now.getTime() - lastSeenAt.getTime() > SESSION_TOUCH_MINUTES * 60 * 1000) {
    await supabase
      .from("auth_sessions")
      .update({ last_seen_at: now.toISOString() })
      .eq("id", sessionId)
      .eq("company_id", identity.companyId)
      .eq("user_id", identity.userId)
      .is("revoked_at", null);
  }

  return true;
};

const resolveRolesAndPermissions = async (
  accessToken: string,
  userId: string,
  companyId: string
): Promise<{ role: string | null; permissions: string[] }> => {
  const supabase = createUserScopedSupabaseServerClient(accessToken);

  const { data: userRoleRows, error: userRolesError } = await supabase
    .from("user_roles")
    .select("role_id, company_id")
    .eq("user_id", userId)
    .eq("company_id", companyId);

  if (userRolesError) {
    throw new Error(userRolesError.message);
  }

  const userRoles = ((userRoleRows ?? []) as UserRoleRow[]).filter((row) => row.company_id === companyId);
  const roleIds = uniqueStrings(userRoles.map((row) => row.role_id));

  if (roleIds.length === 0) {
    return { role: null, permissions: [] };
  }

  const { data: roleRows, error: rolesError } = await supabase
    .from("roles")
    .select("id, name, is_system_role")
    .in("id", roleIds)
    .is("is_deleted", false);

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  const roles = (roleRows ?? []) as RoleRow[];
  const resolvedRoleIds = new Set(roles.map((row) => row.id));

  if (resolvedRoleIds.size === 0) {
    return { role: null, permissions: [] };
  }

  const { data: rolePermissionRows, error: rolePermissionsError } = await supabase
    .from("role_permissions")
    .select("role_id, permission_id")
    .in("role_id", Array.from(resolvedRoleIds));

  if (rolePermissionsError) {
    throw new Error(rolePermissionsError.message);
  }

  const permissionIds = uniqueStrings(((rolePermissionRows ?? []) as RolePermissionRow[]).map((row) => row.permission_id));

  if (permissionIds.length === 0) {
    return {
      role: selectPrimaryRole(roles),
      permissions: []
    };
  }

  const { data: permissionRows, error: permissionsError } = await supabase
    .from("permissions")
    .select("id, key")
    .in("id", permissionIds);

  if (permissionsError) {
    throw new Error(permissionsError.message);
  }

  const permissions = uniqueStrings(((permissionRows ?? []) as PermissionRow[]).map((row) => row.key)).sort();

  return {
    role: selectPrimaryRole(roles),
    permissions
  };
};

const resolveLastLoginAt = async (
  accessToken: string,
  companyId: string,
  userId: string,
  sessionId: string | null
): Promise<string | null> => {
  if (!sessionId) return null;
  const supabase = createUserScopedSupabaseServerClient(accessToken);
  const { data, error } = await supabase
    .from("auth_sessions")
    .select("created_at")
    .eq("id", sessionId)
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.created_at) {
    return null;
  }

  return data.created_at as string;
};

const resolveTodayShiftSummary = async (
  accessToken: string,
  companyId: string,
  userProfileId: string
): Promise<{ employeeId: string | null; employeeCode: string | null; shiftStartTime: string | null; shiftEndTime: string | null; shiftHours: number | null }> => {
  const supabase = createUserScopedSupabaseServerClient(accessToken);

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, employee_code")
    .eq("company_id", companyId)
    .eq("user_profile_id", userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  if (employeeError || !employee?.id) {
    return {
      employeeId: null,
      employeeCode: null,
      shiftStartTime: null,
      shiftEndTime: null,
      shiftHours: null
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance_records")
    .select("shift_start_time, shift_end_time")
    .eq("company_id", companyId)
    .eq("employee_id", employee.id as string)
    .eq("attendance_date", today)
    .is("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!attendanceError && attendance) {
    const shiftStartTime = (attendance.shift_start_time as string | null) ?? null;
    const shiftEndTime = (attendance.shift_end_time as string | null) ?? null;
    return {
      employeeId: employee.id as string,
      employeeCode: (employee.employee_code as string | null) ?? null,
      shiftStartTime,
      shiftEndTime,
      shiftHours: computeShiftHours(shiftStartTime, shiftEndTime)
    };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("employee_shift_assignments")
    .select("shift_template_id")
    .eq("company_id", companyId)
    .eq("employee_id", employee.id as string)
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .is("is_deleted", false)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (assignmentError || !assignment?.shift_template_id) {
    return {
      employeeId: employee.id as string,
      employeeCode: (employee.employee_code as string | null) ?? null,
      shiftStartTime: null,
      shiftEndTime: null,
      shiftHours: null
    };
  }

  const { data: template, error: templateError } = await supabase
    .from("shift_templates")
    .select("start_time, end_time")
    .eq("company_id", companyId)
    .eq("id", assignment.shift_template_id as string)
    .is("is_deleted", false)
    .maybeSingle();

  if (templateError || !template) {
    return {
      employeeId: employee.id as string,
      employeeCode: (employee.employee_code as string | null) ?? null,
      shiftStartTime: null,
      shiftEndTime: null,
      shiftHours: null
    };
  }

  const shiftStartTime = (template.start_time as string | null) ?? null;
  const shiftEndTime = (template.end_time as string | null) ?? null;
  return {
    employeeId: employee.id as string,
    employeeCode: (employee.employee_code as string | null) ?? null,
    shiftStartTime,
    shiftEndTime,
    shiftHours: computeShiftHours(shiftStartTime, shiftEndTime)
  };
};

export const getServerSession = async (): Promise<DashboardServerSession> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("lf_access_token")?.value ?? null;
  const refreshToken = cookieStore.get("lf_refresh_token")?.value ?? null;
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;

  if (!accessToken) {
    return {
      accessToken: null,
      refreshToken,
      sessionId,
      userId: null,
      email: null,
      fullName: null,
      avatarUrl: null,
      lastLoginAt: null,
      shiftStartTime: null,
      shiftEndTime: null,
      shiftHours: null,
      companyId: null,
      userProfileId: null,
      employeeId: null,
      role: null,
      permissions: []
    };
  }

  const identity = await resolveUserProfile(accessToken);

  if (!identity) {
    return {
      accessToken: null,
      refreshToken,
      sessionId,
      userId: null,
      email: null,
      fullName: null,
      avatarUrl: null,
      lastLoginAt: null,
      shiftStartTime: null,
      shiftEndTime: null,
      shiftHours: null,
      companyId: null,
      userProfileId: null,
      employeeId: null,
      role: null,
      permissions: []
    };
  }

  const sessionValid = await validateAuthSession(accessToken, sessionId, {
    userId: identity.userId,
    companyId: identity.companyId,
    userUpdatedAt: identity.userUpdatedAt
  });

  if (!sessionValid) {
    return {
      accessToken: null,
      refreshToken,
      sessionId,
      userId: null,
      email: null,
      fullName: null,
      avatarUrl: null,
      lastLoginAt: null,
      shiftStartTime: null,
      shiftEndTime: null,
      shiftHours: null,
      companyId: null,
      userProfileId: null,
      employeeId: null,
      role: null,
      permissions: []
    };
  }

  const { role, permissions } = await resolveRolesAndPermissions(accessToken, identity.userId, identity.companyId);
  const [lastLoginAt, shiftSummary] = await Promise.all([
    resolveLastLoginAt(accessToken, identity.companyId, identity.userId, sessionId),
    resolveTodayShiftSummary(accessToken, identity.companyId, identity.userProfileId)
  ]);

  return {
    accessToken,
    refreshToken,
    sessionId,
    userId: identity.userId,
    email: identity.email,
    fullName: identity.fullName,
    avatarUrl: identity.avatarUrl,
    lastLoginAt,
    shiftStartTime: shiftSummary.shiftStartTime,
    shiftEndTime: shiftSummary.shiftEndTime,
    shiftHours: shiftSummary.shiftHours,
    companyId: identity.companyId,
    userProfileId: identity.userProfileId,
    employeeId: shiftSummary.employeeId,
    employeeCode: shiftSummary.employeeCode,
    role,
    permissions
  };
};

export const buildAuthContext = async (): Promise<AuthContext> => {
  const session = await getServerSession();

  if (!session.userId || !session.companyId || !session.accessToken || !session.userProfileId) {
    throw new Error("Authenticated company-scoped session required");
  }

  return buildAuthContextFromAccessToken(session.accessToken);
};

export const buildAuthContextFromAccessToken = async (accessToken: string): Promise<AuthContext> => {
  const identity = await resolveUserProfile(accessToken);

  if (!identity) {
    throw new Error("Authenticated company-scoped session required");
  }

  const { role, permissions } = await resolveRolesAndPermissions(accessToken, identity.userId, identity.companyId);

  return {
    supabase: createUserScopedSupabaseServerClient(accessToken),
    userId: identity.userId,
    userProfileId: identity.userProfileId,
    companyId: identity.companyId,
    role: role ?? "employee",
    permissions,
    logger: {
      info: () => undefined,
      warn: () => undefined,
      error: () => undefined
    }
  };
};

export const createAuthSession = async (auth: AuthContext, requestId?: string): Promise<string> => {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();
  const { data, error } = await auth.supabase
    .from("auth_sessions")
    .insert({
      company_id: auth.companyId,
      user_id: auth.userId,
      profile_id: auth.userProfileId,
      expires_at: expiresAt,
      request_id: requestId ?? null
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("AUTH_SESSION_CREATE_FAILED");
  }

  return data.id as string;
};

export const revokeAuthSession = async (
  accessToken: string,
  sessionId: string,
  reason: string
): Promise<void> => {
  const identity = await resolveUserProfile(accessToken);
  if (!identity) return;
  await revokeSession(accessToken, sessionId, { userId: identity.userId, companyId: identity.companyId }, reason);
};

export const revokeAllActiveSessions = async (auth: AuthContext, reason: string): Promise<void> => {
  await auth.supabase
    .from("auth_sessions")
    .update({
      revoked_at: new Date().toISOString(),
      revoked_reason: reason,
      last_seen_at: new Date().toISOString()
    })
    .eq("company_id", auth.companyId)
    .eq("user_id", auth.userId)
    .is("revoked_at", null);
};

