import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminServerClient } from "./supabase-admin";

export type AuthAuditExists = "exists" | "missing";
export type PlatformRoleStatus = "exists" | "missing" | "not_applicable";

type ProfileRow = {
  id: string;
  company_id: string;
};

type MembershipRoleRow = {
  name: string | null;
  is_system_role: boolean | null;
};

type MembershipRow = {
  id: string;
  company_id: string;
  role_id: string;
  roles: MembershipRoleRow | MembershipRoleRow[] | null;
};

export type AuthAuditSummary = {
  authUser: AuthAuditExists;
  profile: AuthAuditExists;
  membership: AuthAuditExists;
  platformRole: PlatformRoleStatus;
  userId: string | null;
  companyId: string | null;
  profileId: string | null;
  healed: {
    profileCreated: boolean;
    membershipCreated: boolean;
    platformRoleAssigned: boolean;
  };
  notes: string[];
};

type AuditOptions = {
  autoHeal?: boolean;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const deriveDisplayName = (authUser: User): string => {
  const metadata = authUser.user_metadata as Record<string, unknown> | null;
  const candidateNames = [
    metadata?.full_name,
    metadata?.name,
    metadata?.display_name
  ];

  for (const value of candidateNames) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  const email = authUser.email ?? "";
  if (email.includes("@")) {
    return email.split("@")[0] ?? "User";
  }

  return "User";
};

const coerceRole = (value: MembershipRow["roles"]): MembershipRoleRow | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
};

const distinct = (values: string[]): string[] => Array.from(new Set(values));

const findAuthUserByEmail = async (email: string): Promise<User | null> => {
  const admin = createSupabaseAdminServerClient();
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 200;

  while (page <= 50) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const users = data.users ?? [];
    const match = users.find((user) => normalizeEmail(user.email ?? "") === target) ?? null;
    if (match) {
      return match;
    }

    if (users.length < perPage) {
      break;
    }
    page += 1;
  }

  return null;
};

const findAuthUserById = async (userId: string): Promise<User | null> => {
  const admin = createSupabaseAdminServerClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    throw new Error(error.message);
  }
  return data.user ?? null;
};

const loadProfile = async (userId: string): Promise<ProfileRow | null> => {
  const admin = createSupabaseAdminServerClient();
  const { data, error } = await admin
    .from("user_profiles")
    .select("id, company_id")
    .eq("user_id", userId)
    .is("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.id || !data.company_id) {
    return null;
  }

  return data as ProfileRow;
};

const loadMemberships = async (userId: string): Promise<MembershipRow[]> => {
  const admin = createSupabaseAdminServerClient();
  const { data, error } = await admin
    .from("user_roles")
    .select("id, company_id, role_id, roles(name, is_system_role)")
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MembershipRow[];
};

const resolveCompanyId = (profile: ProfileRow | null, memberships: MembershipRow[]): string | null => {
  if (profile?.company_id) {
    return profile.company_id;
  }
  const companyIds = distinct(memberships.map((row) => row.company_id).filter((value): value is string => Boolean(value)));
  if (companyIds.length === 1) {
    return companyIds[0] ?? null;
  }
  return null;
};

const hasPlatformRoleAssignment = (memberships: MembershipRow[]): boolean => {
  return memberships.some((row) => {
    const role = coerceRole(row.roles);
    return Boolean(role?.is_system_role) && (role?.name ?? "").toLowerCase() === "platform owner";
  });
};

const createProfileIfMissing = async (user: User, companyId: string): Promise<boolean> => {
  const existing = await loadProfile(user.id);
  if (existing) return false;

  const admin = createSupabaseAdminServerClient();
  const { error } = await admin.from("user_profiles").insert({
    user_id: user.id,
    company_id: companyId,
    full_name: deriveDisplayName(user),
    is_active: true
  });

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  return true;
};

const assignDefaultMembershipIfMissing = async (userId: string, companyId: string): Promise<boolean> => {
  const memberships = await loadMemberships(userId);
  if (memberships.length > 0) return false;

  const admin = createSupabaseAdminServerClient();
  const { data: role, error: roleError } = await admin
    .from("roles")
    .select("id")
    .eq("company_id", companyId)
    .eq("is_deleted", false)
    .ilike("name", "employee")
    .limit(1)
    .maybeSingle();

  if (roleError) {
    throw new Error(roleError.message);
  }

  if (!role?.id) {
    throw new Error("ROLE_MISSING");
  }

  const { error } = await admin.from("user_roles").upsert(
    {
      user_id: userId,
      company_id: companyId,
      role_id: role.id
    },
    { onConflict: "user_id,role_id,company_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

const assignPlatformOwnerRoleIfConfigured = async (user: User, companyId: string): Promise<boolean> => {
  const configuredEmail = (process.env.PLATFORM_OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!configuredEmail || normalizeEmail(user.email ?? "") !== configuredEmail) {
    return false;
  }

  const memberships = await loadMemberships(user.id);
  if (hasPlatformRoleAssignment(memberships)) {
    return false;
  }

  const admin = createSupabaseAdminServerClient();
  const { data: platformRole, error: platformRoleError } = await admin
    .from("roles")
    .select("id")
    .eq("is_system_role", true)
    .eq("is_deleted", false)
    .ilike("name", "Platform Owner")
    .limit(1)
    .maybeSingle();

  if (platformRoleError) {
    throw new Error(platformRoleError.message);
  }

  if (!platformRole?.id) {
    return false;
  }

  const { error } = await admin.from("user_roles").upsert(
    {
      user_id: user.id,
      company_id: companyId,
      role_id: platformRole.id
    },
    { onConflict: "user_id,role_id,company_id" }
  );

  if (error) {
    throw new Error(error.message);
  }

  return true;
};

const buildAuditSummary = async (authUser: User | null, notes: string[], healed: AuthAuditSummary["healed"]): Promise<AuthAuditSummary> => {
  if (!authUser) {
    return {
      authUser: "missing",
      profile: "missing",
      membership: "missing",
      platformRole: "not_applicable",
      userId: null,
      companyId: null,
      profileId: null,
      healed,
      notes
    };
  }

  const profile = await loadProfile(authUser.id);
  const memberships = await loadMemberships(authUser.id);
  const companyId = resolveCompanyId(profile, memberships);
  const platformRole = hasPlatformRoleAssignment(memberships) ? "exists" : "missing";

  return {
    authUser: "exists",
    profile: profile ? "exists" : "missing",
    membership: memberships.length > 0 ? "exists" : "missing",
    platformRole,
    userId: authUser.id,
    companyId,
    profileId: profile?.id ?? null,
    healed,
    notes
  };
};

const auditAndMaybeHeal = async (authUser: User | null, options: AuditOptions): Promise<AuthAuditSummary> => {
  const healed = {
    profileCreated: false,
    membershipCreated: false,
    platformRoleAssigned: false
  };
  const notes: string[] = [];

  if (!authUser) {
    return buildAuditSummary(null, notes, healed);
  }

  if (options.autoHeal) {
    const memberships = await loadMemberships(authUser.id);
    const profileBefore = await loadProfile(authUser.id);
    const companyId = resolveCompanyId(profileBefore, memberships);

    if (!profileBefore && companyId) {
      healed.profileCreated = await createProfileIfMissing(authUser, companyId);
      if (healed.profileCreated) {
        notes.push("Created missing user_profiles row.");
      }
    } else if (!profileBefore && !companyId) {
      notes.push("Could not determine company_id for missing profile.");
    }

    const profileAfter = await loadProfile(authUser.id);
    if (profileAfter?.company_id) {
      healed.membershipCreated = await assignDefaultMembershipIfMissing(authUser.id, profileAfter.company_id);
      if (healed.membershipCreated) {
        notes.push("Created default Employee role membership.");
      }
      healed.platformRoleAssigned = await assignPlatformOwnerRoleIfConfigured(authUser, profileAfter.company_id);
      if (healed.platformRoleAssigned) {
        notes.push("Assigned Platform Owner role from PLATFORM_OWNER_EMAIL policy.");
      }
    }
  }

  return buildAuditSummary(authUser, notes, healed);
};

export const auditAuthByEmail = async (email: string, options: AuditOptions = {}): Promise<AuthAuditSummary> => {
  const authUser = await findAuthUserByEmail(email);
  return auditAndMaybeHeal(authUser, options);
};

export const auditAuthByUserId = async (
  userId: string,
  options: AuditOptions = {}
): Promise<AuthAuditSummary> => {
  const authUser = await findAuthUserById(userId);
  return auditAndMaybeHeal(authUser, options);
};

