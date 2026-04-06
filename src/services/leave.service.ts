import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope, requirePermission } from "../lib/auth-wrapper";
import { requirePlanFeature } from "../lib/entitlements";

export type LeavePayload = {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  reason?: string;
  is_half_day?: boolean;
  half_day_type?: "first_half" | "second_half";
};

export type LeaveBalanceItem = {
  id: string;
  leave_type_id: string;
  year: number;
  entitled_days: number;
  used_days: number;
  remaining_days: number;
  leave_type_name?: string | null;
  leave_type_is_paid?: boolean | null;
};

export type LeaveTypeItem = {
  id: string;
  name: string;
  description?: string | null;
  is_paid: boolean;
  gender_restriction?: string | null;
};

export type LeaveRequestItem = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason?: string | null;
  is_half_day: boolean;
  half_day_type?: string | null;
  approval_level?: number | null;
  final_approved?: boolean | null;
  created_at: string;
  updated_at: string;
  approved_at?: string | null;
  employee_name?: string | null;
  employee_avatar_url?: string | null;
  department_id?: string | null;
  leave_type_name?: string | null;
  next_approver_name?: string | null;
  approval_stage_label?: string | null;
  attachments?: LeaveRequestAttachmentItem[];
};

export type LeaveRequestAttachmentItem = {
  id: string;
  file_name: string;
  storage_bucket?: string | null;
  storage_path?: string | null;
  storage_mime_type?: string | null;
  storage_size?: number | null;
  download_url?: string | null;
};

export type LeaveRequestFilters = {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};

export type LeaveReviewFilters = LeaveRequestFilters & {
  employeeId?: string;
};

type LeaveAttachmentRow = {
  id: string;
  file_name: string;
  storage_bucket?: string | null;
  storage_path?: string | null;
  storage_mime_type?: string | null;
  storage_size?: number | null;
};

type ApprovalDirectoryRow = {
  id: string;
  manager_id?: string | null;
  designation?: string | null;
  user_profile_id?: string | null;
  user_profiles?: {
    full_name?: string | null;
    user_id?: string | null;
  } | null;
};

type ApprovalDirectoryEntry = {
  employeeId: string;
  managerId: string | null;
  designation: string | null;
  userProfileId: string | null;
  userId: string | null;
  fullName: string | null;
  roleName: string | null;
};

type LeaveApprovalRole =
  | "employee"
  | "team_lead"
  | "manager"
  | "hr"
  | "admin"
  | "finance"
  | "executive"
  | "other";

type LeaveApprovalStep = ApprovalDirectoryEntry & {
  stageLabel: string;
};

const sanitizeError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  if (message === "UNAUTHENTICATED" || message.includes("JWT")) return "Authentication required";
  if (message === "ACTOR_MISMATCH" || message === "TENANT_RESOLUTION_FAILED") return "Permission denied";
  if (message === "APPROVAL_NOT_PENDING") return "Leave request already processed";
  if (message === "INVALID_STATE_TRANSITION") return "Invalid state transition";
  if (message.toLowerCase().includes("permission")) return "Permission denied";
  return fallback;
};

const LEAVE_ATTACHMENT_BUCKET = "leave-attachments";
const LEAVE_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const LEAVE_ATTACHMENT_ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const getAdminEnv = (key: string): string => process.env[key] ?? "";

const createSupabaseAdminClient = (): SupabaseClient => {
  const url = getAdminEnv("SUPABASE_URL") || getAdminEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getAdminEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

const mapLeaveAttachment = (row: LeaveAttachmentRow): LeaveRequestAttachmentItem => ({
  id: row.id,
  file_name: row.file_name,
  storage_bucket: row.storage_bucket ?? null,
  storage_path: row.storage_path ?? null,
  storage_mime_type: row.storage_mime_type ?? null,
  storage_size: row.storage_size ?? null,
});

const enrichLeaveRequestsWithAttachments = async (
  admin: SupabaseClient,
  requests: LeaveRequestItem[]
): Promise<LeaveRequestItem[]> => {
  return Promise.all(
    requests.map(async (request) => {
      const attachments = (request.attachments ?? []).filter(
        (item) => item.storage_bucket && item.storage_path
      );

      if (attachments.length === 0) {
        return { ...request, attachments: [] };
      }

      const resolvedAttachments = await Promise.all(
        attachments.map(async (attachment) => {
          try {
            const { data } = await admin.storage
              .from(attachment.storage_bucket as string)
              .createSignedUrl(attachment.storage_path as string, 60 * 15);

            return {
              ...attachment,
              download_url: data?.signedUrl ?? null,
            } satisfies LeaveRequestAttachmentItem;
          } catch {
            return attachment;
          }
        })
      );

      return {
        ...request,
        attachments: resolvedAttachments,
      } satisfies LeaveRequestItem;
    })
  );
};

const normalizeRoleName = (value?: string | null): string =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_-]+/g, " ");

const ROLE_PRIORITY = [
  ["founder", "ceo", "founder ceo", "ceo founder"],
  ["admin", "org owner", "org_owner"],
  ["hr"],
  ["finance manager", "finance", "finance admin", "finance lead"],
  ["director", "senior manager", "manager", "supervisor"],
  ["team lead", "team_lead", "teamlead"],
  ["employee"]
] as const;

const selectPrimaryRoleName = (roleNames: string[]): string | null => {
  if (roleNames.length === 0) return null;

  const rank = (name: string): number => {
    const normalized = normalizeRoleName(name);
    const index = ROLE_PRIORITY.findIndex((aliases) => aliases.some((alias) => normalizeRoleName(alias) === normalized));
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
  };

  return [...roleNames].sort((a, b) => {
    const aRank = rank(a);
    const bRank = rank(b);
    if (aRank !== bRank) return aRank - bRank;
    return a.localeCompare(b);
  })[0] ?? null;
};

const uniqueApprovalSteps = (steps: Array<LeaveApprovalStep | null | undefined>): LeaveApprovalStep[] => {
  const seen = new Set<string>();
  const output: LeaveApprovalStep[] = [];
  for (const step of steps) {
    if (!step?.employeeId || seen.has(step.employeeId)) continue;
    seen.add(step.employeeId);
    output.push(step);
  }
  return output;
};

const classifyLeaveApprovalRole = (entry?: ApprovalDirectoryEntry | null): LeaveApprovalRole => {
  if (!entry) return "other";

  const role = normalizeRoleName(entry.roleName);
  const designation = normalizeRoleName(entry.designation);
  const text = `${role} ${designation}`.trim();

  if (text.includes("founder") || text.includes("ceo") || text.includes("chief")) return "executive";
  if (text.includes(" hr") || text.startsWith("hr") || text.includes("human resources")) return "hr";
  if (text.includes("admin")) return "admin";
  if (text.includes("finance")) return "finance";
  if (text.includes("team lead") || text.includes("teamlead") || text.includes("supervisor")) return "team_lead";
  if (text.includes("manager") || text.includes("director") || text.includes("lead manager")) return "manager";
  if (text.includes("employee") || text.includes("agent") || text.includes("associate")) return "employee";
  return "other";
};

const stageForStep = (index: number, total: number): string =>
  total <= 1 ? "Final approval" : `Stage ${index + 1} of ${total}`;

const enrichApprovalSteps = (entries: ApprovalDirectoryEntry[]): LeaveApprovalStep[] =>
  entries.map((entry, index) => ({
    ...entry,
    stageLabel: stageForStep(index, entries.length)
  }));

const loadApprovalDirectory = async (
  ctx: ServiceContext,
  client: SupabaseClient
): Promise<Map<string, ApprovalDirectoryEntry>> => {
  const { data: employees, error: employeeError } = await client
    .from("employees")
    .select("id, manager_id, designation, user_profile_id, user_profiles(full_name, user_id)")
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false);

  if (employeeError) {
    throw new Error(employeeError.message);
  }

  const employeeRows = (employees ?? []) as ApprovalDirectoryRow[];
  const userIds = Array.from(
    new Set(
      employeeRows
        .map((row) => row.user_profiles?.user_id ?? null)
        .filter((value): value is string => Boolean(value))
    )
  );

  const roleNamesByUserId = new Map<string, string[]>();

  if (userIds.length > 0) {
    const { data: userRoles, error: roleError } = await client
      .from("user_roles")
      .select("user_id, roles(name)")
      .eq("company_id", ctx.companyId)
      .in("user_id", userIds);

    if (roleError) {
      throw new Error(roleError.message);
    }

    for (const row of (userRoles ?? []) as Array<{ user_id?: string | null; roles?: { name?: string | null } | null }>) {
      const userId = row.user_id ?? null;
      const roleName = row.roles?.name ?? null;
      if (!userId || !roleName) continue;
      const values = roleNamesByUserId.get(userId) ?? [];
      values.push(roleName);
      roleNamesByUserId.set(userId, values);
    }
  }

  const directory = new Map<string, ApprovalDirectoryEntry>();
  for (const row of employeeRows) {
    const userId = row.user_profiles?.user_id ?? null;
    directory.set(row.id, {
      employeeId: row.id,
      managerId: row.manager_id ?? null,
      designation: row.designation ?? null,
      userProfileId: row.user_profile_id ?? null,
      userId,
      fullName: row.user_profiles?.full_name ?? null,
      roleName: userId ? selectPrimaryRoleName(roleNamesByUserId.get(userId) ?? []) : null
    });
  }

  return directory;
};

const firstEntryByRole = (
  directory: Map<string, ApprovalDirectoryEntry>,
  role: LeaveApprovalRole,
  excludeEmployeeIds: string[] = []
): ApprovalDirectoryEntry | null => {
  for (const entry of directory.values()) {
    if (excludeEmployeeIds.includes(entry.employeeId)) continue;
    if (classifyLeaveApprovalRole(entry) === role) return entry;
  }
  return null;
};

const resolveLeaveApprovalChain = (
  employeeId: string,
  directory: Map<string, ApprovalDirectoryEntry>
): LeaveApprovalStep[] => {
  const requester = directory.get(employeeId);
  if (!requester) return [];

  const requesterRole = classifyLeaveApprovalRole(requester);
  const directManager = requester.managerId ? directory.get(requester.managerId) ?? null : null;
  const skipLevelManager = directManager?.managerId ? directory.get(directManager.managerId) ?? null : null;
  const hrApprover = firstEntryByRole(directory, "hr", [employeeId]);
  const adminApprover = firstEntryByRole(directory, "admin", [employeeId]);
  const executiveApprover = firstEntryByRole(directory, "executive", [employeeId]);

  if (requesterRole === "employee") {
    const directRole = classifyLeaveApprovalRole(directManager);
    const chain = uniqueApprovalSteps([
      directManager
        ? { ...directManager, stageLabel: "" }
        : null,
      directRole === "team_lead" && skipLevelManager ? { ...skipLevelManager, stageLabel: "" } : null,
      hrApprover ? { ...hrApprover, stageLabel: "" } : null
    ]);
    return enrichApprovalSteps(chain);
  }

  if (requesterRole === "team_lead") {
    return enrichApprovalSteps(uniqueApprovalSteps([directManager ? { ...directManager, stageLabel: "" } : null]));
  }

  if (requesterRole === "manager") {
    return enrichApprovalSteps(
      uniqueApprovalSteps([
        hrApprover ? { ...hrApprover, stageLabel: "" } : null,
        adminApprover ? { ...adminApprover, stageLabel: "" } : null,
        directManager ? { ...directManager, stageLabel: "" } : null
      ]).slice(0, 1)
    );
  }

  if (requesterRole === "hr" || requesterRole === "admin" || requesterRole === "finance") {
    return enrichApprovalSteps(
      uniqueApprovalSteps([
        executiveApprover ? { ...executiveApprover, stageLabel: "" } : null,
        directManager ? { ...directManager, stageLabel: "" } : null
      ]).slice(0, 1)
    );
  }

  if (requesterRole === "executive") {
    return enrichApprovalSteps(
      uniqueApprovalSteps([
        adminApprover ? { ...adminApprover, stageLabel: "" } : null,
        hrApprover ? { ...hrApprover, stageLabel: "" } : null
      ]).slice(0, 1)
    );
  }

  return enrichApprovalSteps(
    uniqueApprovalSteps([
      directManager ? { ...directManager, stageLabel: "" } : null,
      hrApprover ? { ...hrApprover, stageLabel: "" } : null,
      adminApprover ? { ...adminApprover, stageLabel: "" } : null
    ]).slice(0, 1)
  );
};

const requireLeaveEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_leave_management");
};

const getActorProfileId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const { data } = await client
    .from("user_profiles")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .maybeSingle();

  return data?.id ?? null;
};

const getActorEmployeeId = async (
  client: SupabaseClient,
  ctx: ServiceContext
): Promise<string | null> => {
  const actorProfileId = await getActorProfileId(client, ctx);

  if (!actorProfileId) {
    return null;
  }

  const { data } = await client
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", actorProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return data?.id ?? null;
};

const hasLeaveReviewAuthority = (ctx: ServiceContext): boolean =>
  ctx.permissions.includes("manage_employees") || ctx.permissions.includes("manage_attendance");

const ensureSelfOrManager = async (
  ctx: ServiceContext,
  employeeId: string
): Promise<{ actorProfileId: string | null; actorEmployeeId: string | null; isSelf: boolean }> => {
  const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
  const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
  const isSelf = actorEmployeeId !== null && actorEmployeeId === employeeId;

  if (!isSelf && !hasLeaveReviewAuthority(ctx)) {
    requirePermission("manage_employees", ctx);
  }

  return { actorProfileId, actorEmployeeId, isSelf };
};

const applyDateFilters = (query: any, filters?: LeaveRequestFilters) => {
  if (filters?.status?.length) {
    query = query.in("status", filters.status);
  }
  if (filters?.dateFrom) {
    query = query.gte("start_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("end_date", filters.dateTo);
  }
  return query;
};

const getEmployeeGender = async (
  ctx: ServiceContext,
  client: SupabaseClient,
  employeeId: string
): Promise<string | null> => {
  const { data, error } = await client
    .from("employee_personal_details")
    .select("gender")
    .eq("company_id", ctx.companyId)
    .eq("employee_id", employeeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeRoleName((data?.gender as string | null) ?? null) || null;
};

const filterLeaveTypesByGender = (leaveTypes: LeaveTypeItem[], gender: string | null): LeaveTypeItem[] => {
  if (!gender) {
    return leaveTypes.filter((item) => !item.gender_restriction);
  }

  return leaveTypes.filter((item) => {
    const restriction = normalizeRoleName(item.gender_restriction);
    return !restriction || restriction === gender;
  });
};

const enrichLeaveRequestsWithApprovalStage = (
  requests: LeaveRequestItem[],
  directory: Map<string, ApprovalDirectoryEntry>
): LeaveRequestItem[] => {
  return requests.map((request) => {
    const chain = resolveLeaveApprovalChain(request.employee_id, directory);
    if (chain.length === 0) return request;

    const currentIndex = Math.max(0, Math.min((request.approval_level ?? 1) - 1, chain.length - 1));
    const nextApprover = request.status === "pending" ? chain[currentIndex] ?? null : null;
    const stageLabel =
      request.status === "approved"
        ? `Final approval complete`
        : request.status === "rejected"
          ? "Rejected"
          : request.status === "cancelled"
            ? "Cancelled"
            : nextApprover?.stageLabel ?? stageForStep(currentIndex, chain.length);

    return {
      ...request,
      approval_level: request.approval_level ?? 1,
      final_approved: request.final_approved ?? request.status === "approved",
      next_approver_name: nextApprover?.fullName ?? null,
      approval_stage_label: stageLabel
    } as LeaveRequestItem;
  });
};

const resolveCurrentApprovalStep = (
  request: Pick<LeaveRequestItem, "employee_id" | "approval_level">,
  directory: Map<string, ApprovalDirectoryEntry>
): { chain: LeaveApprovalStep[]; currentStep: LeaveApprovalStep | null; currentLevel: number } => {
  const chain = resolveLeaveApprovalChain(request.employee_id, directory);
  if (chain.length === 0) {
    return { chain, currentStep: null, currentLevel: 1 };
  }

  const currentLevel = Math.max(1, request.approval_level ?? 1);
  const currentIndex = Math.min(currentLevel - 1, chain.length - 1);
  return {
    chain,
    currentStep: chain[currentIndex] ?? null,
    currentLevel
  };
};

const ensureActorCanReviewRequest = (
  ctx: ServiceContext,
  actorEmployeeId: string | null,
  request: Pick<LeaveRequestItem, "employee_id" | "approval_level">,
  directory: Map<string, ApprovalDirectoryEntry>
): { chain: LeaveApprovalStep[]; currentStep: LeaveApprovalStep | null; currentLevel: number } => {
  const approval = resolveCurrentApprovalStep(request, directory);

  if (!actorEmployeeId || !approval.currentStep || approval.currentStep.employeeId !== actorEmployeeId) {
    throw new Error("Leave request is waiting on a different approver");
  }

  return approval;
};

const createLeaveNotification = async (
  client: SupabaseClient,
  companyId: string,
  recipientProfileId: string | null,
  actorProfileId: string | null,
  type: string,
  title: string,
  message: string,
  requestId: string
) => {
  if (!recipientProfileId || !actorProfileId) return;

  await client.from("notifications").insert({
    company_id: companyId,
    recipient_profile_id: recipientProfileId,
    type,
    title,
    message,
    reference_type: "leave_request",
    reference_id: requestId,
    created_by: actorProfileId,
    updated_by: actorProfileId
  });
};


export const listLeaveTypes = async (
  ctx: ServiceContext,
  employeeId?: string | null
): Promise<ServiceResult<{ leaveTypes: LeaveTypeItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);

    const { data, error } = await ctx.supabase
      .from("leave_types")
      .select("id, name, description, is_paid, gender_restriction")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("name", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave type lookup failed") };
    }

    const leaveTypes = (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      is_paid: Boolean(row.is_paid),
      gender_restriction: (row.gender_restriction as string | null) ?? null
    }));

    if (!employeeId) {
      return {
        ok: true,
        data: {
          leaveTypes
        }
      };
    }

    assertEmployeeScope(employeeId, ctx);
    const admin = createSupabaseAdminClient();
    const gender = await getEmployeeGender(ctx, admin, employeeId);

    return {
      ok: true,
      data: {
        leaveTypes: filterLeaveTypesByGender(leaveTypes, gender)
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave type lookup failed" };
  }
};

export const applyLeave = async (
  ctx: ServiceContext,
  employeeId: string,
  payload: LeavePayload
): Promise<ServiceResult<{ requestId: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    const identity = await ensureSelfOrManager(ctx, employeeId);

    if (payload.is_half_day && !payload.half_day_type) {
      return { ok: false, error: "Half-day type is required" };
    }

    const { data: balance } = await ctx.supabase
      .from("leave_balances")
      .select("remaining_days")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .eq("leave_type_id", payload.leave_type_id)
      .is("is_deleted", false)
      .maybeSingle();

    if (!balance) {
      return { ok: false, error: "Leave balance not found" };
    }

    const { data: overlap } = await ctx.supabase
      .from("leave_requests")
      .select("id")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .in("status", ["pending", "approved"])
      .lte("start_date", payload.end_date)
      .gte("end_date", payload.start_date)
      .is("is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (overlap?.id) {
      return { ok: false, error: "Overlapping leave request exists" };
    }

    const { data, error } = await ctx.supabase
      .from("leave_requests")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        leave_type_id: payload.leave_type_id,
        start_date: payload.start_date,
        end_date: payload.end_date,
        total_days: 0,
        reason: payload.reason ?? null,
        status: "pending",
        approval_level: 1,
        final_approved: false,
        is_half_day: payload.is_half_day ?? false,
        half_day_type: payload.half_day_type ?? null,
        applied_by: identity.actorProfileId,
        created_by: identity.actorProfileId,
        updated_by: identity.actorProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message ?? "", "Leave request failed") };
    }

    if (identity.actorProfileId) {
      await ctx.supabase.from("notifications").insert({
        company_id: ctx.companyId,
        recipient_profile_id: identity.actorProfileId,
        type: "leave_request",
        title: "Leave request submitted",
        message: payload.reason ?? "Leave request",
        reference_type: "leave_request",
        reference_id: data.id,
        created_by: identity.actorProfileId,
        updated_by: identity.actorProfileId
      });
    }

    const admin = createSupabaseAdminClient();
    const directory = await loadApprovalDirectory(ctx, admin);
    const approval = resolveCurrentApprovalStep(
      {
        employee_id: employeeId,
        approval_level: 1
      },
      directory
    );

    await createLeaveNotification(
      admin,
      ctx.companyId,
      approval.currentStep?.userProfileId ?? null,
      identity.actorProfileId,
      "leave_review",
      "Leave request awaiting your review",
      payload.reason?.trim()
        ? `${directory.get(employeeId)?.fullName ?? "An employee"} submitted a leave request: ${payload.reason.trim()}`
        : `${directory.get(employeeId)?.fullName ?? "An employee"} submitted a leave request that needs your review.`,
      data.id
    );

    return { ok: true, data: { requestId: data.id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave apply error" };
  }
};

export const listLeaveBalances = async (
  ctx: ServiceContext,
  employeeId: string,
  year?: number
): Promise<ServiceResult<{ balances: LeaveBalanceItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    await ensureSelfOrManager(ctx, employeeId);

    const adminSupabase = createSupabaseAdminClient();

    let query = adminSupabase
      .from("leave_balances")
      .select("id, leave_type_id, year, entitled_days, used_days, remaining_days, leave_types(name, is_paid)")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false);

    if (typeof year === "number") {
      query = query.eq("year", year);
    }

    const { data, error } = await query.order("year", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave balance lookup failed") };
    }

    const balances = (data ?? []).map((row) => ({
      id: row.id as string,
      leave_type_id: row.leave_type_id as string,
      year: row.year as number,
      entitled_days: Number(row.entitled_days ?? 0),
      used_days: Number(row.used_days ?? 0),
      remaining_days: Number(row.remaining_days ?? 0),
      leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null,
      leave_type_is_paid: (row.leave_types as { is_paid?: boolean } | null)?.is_paid ?? null
    }));

    return { ok: true, data: { balances } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave balances error" };
  }
};

export const listLeaveRequests = async (
  ctx: ServiceContext,
  employeeId: string,
  filters?: LeaveRequestFilters
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    await ensureSelfOrManager(ctx, employeeId);

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url)), leave_request_attachments(id, file_name, storage_bucket, storage_path, storage_mime_type, storage_size)"
      )
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false);

    query = applyDateFilters(query, filters);

    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query.order("start_date", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave history failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null,
        attachments: ((row.leave_request_attachments as LeaveAttachmentRow[] | null) ?? []).map(mapLeaveAttachment)
      } satisfies LeaveRequestItem;
    });

    const directory = await loadApprovalDirectory(ctx, admin);
    const stagedRequests = enrichLeaveRequestsWithApprovalStage(requests, directory);
    const enrichedRequests = await enrichLeaveRequestsWithAttachments(admin, stagedRequests);

    return { ok: true, data: { requests: enrichedRequests } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave history error" };
  }
};

export const listPendingLeaveRequests = async (
  ctx: ServiceContext,
  filters?: LeaveReviewFilters
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    if (!hasLeaveReviewAuthority(ctx)) {
      requirePermission("manage_employees", ctx);
    }

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url)), leave_request_attachments(id, file_name, storage_bucket, storage_path, storage_mime_type, storage_size)"
      )
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .is("is_deleted", false);

    if (filters?.employeeId) {
      query = query.eq("employee_id", filters.employeeId);
    }

    query = applyDateFilters(query, filters);

    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Pending leave lookup failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null,
        attachments: ((row.leave_request_attachments as LeaveAttachmentRow[] | null) ?? []).map(mapLeaveAttachment)
      } satisfies LeaveRequestItem;
    });

    const directory = await loadApprovalDirectory(ctx, admin);
    const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
    const visibleRequests = enrichLeaveRequestsWithApprovalStage(requests, directory).filter((request) => {
      const approval = resolveCurrentApprovalStep(request, directory);
      return actorEmployeeId !== null && approval.currentStep?.employeeId === actorEmployeeId;
    });

    const enrichedRequests = await enrichLeaveRequestsWithAttachments(admin, visibleRequests);

    return { ok: true, data: { requests: enrichedRequests } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Pending leave error" };
  }
};

export const listLeaveApprovalHistory = async (
  ctx: ServiceContext,
  filters?: LeaveReviewFilters
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    if (!hasLeaveReviewAuthority(ctx)) {
      requirePermission("manage_employees", ctx);
    }

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url)), leave_request_attachments(id, file_name, storage_bucket, storage_path, storage_mime_type, storage_size)"
      )
      .eq("company_id", ctx.companyId)
      .neq("status", "pending")
      .is("is_deleted", false);

    if (filters?.employeeId) {
      query = query.eq("employee_id", filters.employeeId);
    }

    query = applyDateFilters(query, filters);

    if (filters?.limit) {
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + filters.limit - 1);
    }

    const { data, error } = await query.order("updated_at", { ascending: false });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave history lookup failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null,
        attachments: ((row.leave_request_attachments as LeaveAttachmentRow[] | null) ?? []).map(mapLeaveAttachment)
      } satisfies LeaveRequestItem;
    });

    const directory = await loadApprovalDirectory(ctx, admin);
    const stagedRequests = enrichLeaveRequestsWithApprovalStage(requests, directory);
    const enrichedRequests = await enrichLeaveRequestsWithAttachments(admin, stagedRequests);

    return { ok: true, data: { requests: enrichedRequests } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave approval history error" };
  }
};

export const getTeamLeaveCalendar = async (
  ctx: ServiceContext,
  dateFrom: string,
  dateTo: string
): Promise<ServiceResult<{ requests: LeaveRequestItem[] }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    if (!hasLeaveReviewAuthority(ctx)) {
      requirePermission("manage_employees", ctx);
    }

    const admin = createSupabaseAdminClient();

    const { data, error } = await admin
      .from("leave_requests")
      .select(
        "id, employee_id, leave_type_id, start_date, end_date, total_days, status, reason, is_half_day, half_day_type, approval_level, final_approved, created_at, updated_at, approved_at, leave_types(name), employees!leave_requests_employee_id_fkey(id, department_id, user_profile_id, user_profiles(full_name, avatar_url))"
      )
      .eq("company_id", ctx.companyId)
      .in("status", ["pending", "approved"])
      .lte("start_date", dateTo)
      .gte("end_date", dateFrom)
      .is("is_deleted", false)
      .order("start_date", { ascending: true });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave calendar lookup failed") };
    }

    const requests = (data ?? []).map((row) => {
      const employee = row.employees as {
        user_profiles?: { full_name?: string; avatar_url?: string } | null;
        department_id?: string | null;
      } | null;

      return {
        id: row.id as string,
        employee_id: row.employee_id as string,
        leave_type_id: row.leave_type_id as string,
        start_date: row.start_date as string,
        end_date: row.end_date as string,
        total_days: Number(row.total_days ?? 0),
        status: row.status as string,
        reason: row.reason as string | null,
        is_half_day: Boolean(row.is_half_day),
        half_day_type: row.half_day_type as string | null,
        approval_level: (row.approval_level as number | null) ?? null,
        final_approved: (row.final_approved as boolean | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        approved_at: row.approved_at as string | null,
        employee_name: employee?.user_profiles?.full_name ?? null,
        employee_avatar_url: employee?.user_profiles?.avatar_url ?? null,
        department_id: employee?.department_id ?? null,
        leave_type_name: (row.leave_types as { name?: string } | null)?.name ?? null
      } satisfies LeaveRequestItem;
    });

    const directory = await loadApprovalDirectory(ctx, admin);

    return { ok: true, data: { requests: enrichLeaveRequestsWithApprovalStage(requests, directory) } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave calendar error" };
  }
};

export const approveLeave = async (
  ctx: ServiceContext,
  requestId: string
): Promise<ServiceResult<{ status: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    if (!hasLeaveReviewAuthority(ctx)) {
      requirePermission("manage_employees", ctx);
    }
    const actorProfileId = await getActorProfileId(ctx.supabase, ctx);
    const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
    const admin = createSupabaseAdminClient();
    const directory = await loadApprovalDirectory(ctx, admin);

    const { data: request, error: requestError } = await admin
      .from("leave_requests")
      .select("id, employee_id, leave_type_id, total_days, status, approval_level")
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (requestError) {
      return { ok: false, error: sanitizeError(requestError.message, "Leave request approval failed") };
    }

    if (!request) {
      return { ok: false, error: "Leave request not found" };
    }

    if (request.status !== "pending") {
      return { ok: false, error: "Leave request already processed" };
    }

    const approval = ensureActorCanReviewRequest(
      ctx,
      actorEmployeeId,
      {
        employee_id: request.employee_id as string,
        approval_level: (request.approval_level as number | null) ?? 1
      },
      directory
    );

    const currentIndex = Math.max(0, approval.currentLevel - 1);
    const isFinalStage = currentIndex >= approval.chain.length - 1;
    const employee = directory.get(request.employee_id as string) ?? null;

    if (!employee) {
      return { ok: false, error: "Leave request employee not found" };
    }

    if (!isFinalStage) {
      const nextStep = approval.chain[currentIndex + 1] ?? null;
      const { error } = await admin
        .from("leave_requests")
        .update({
          approval_level: approval.currentLevel + 1,
          updated_by: actorProfileId
        })
        .eq("id", requestId)
        .eq("company_id", ctx.companyId)
        .eq("status", "pending")
        .is("is_deleted", false);

      if (error) {
        return { ok: false, error: sanitizeError(error.message, "Leave request approval failed") };
      }

      await createLeaveNotification(
        admin,
        ctx.companyId,
        employee.userProfileId,
        actorProfileId,
        "leave_progress",
        "Leave request moved to the next approver",
        nextStep?.fullName ? `Your leave request is now waiting for ${nextStep.fullName}.` : "Your leave request moved to the next approver.",
        requestId
      );

      await createLeaveNotification(
        admin,
        ctx.companyId,
        nextStep?.userProfileId ?? null,
        actorProfileId,
        "leave_review",
        "Leave request awaiting your review",
        employee.fullName ? `${employee.fullName} submitted a leave request that needs your decision.` : "A leave request is awaiting your review.",
        requestId
      );

      return { ok: true, data: { status: "pending" } };
    }

    const { error: updateError } = await admin
      .from("leave_requests")
      .update({
        status: "approved",
        final_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: actorProfileId,
        approval_level: approval.chain.length,
        updated_by: actorProfileId
      })
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .eq("status", "pending")
      .is("is_deleted", false);

    if (updateError) {
      return { ok: false, error: sanitizeError(updateError.message, "Leave request approval failed") };
    }

    await admin.from("approval_audit_log").insert({
      company_id: ctx.companyId,
      entity_type: "leave",
      entity_id: requestId,
      actor_profile_id: actorProfileId,
      action: "approve"
    });

    await admin.from("leave_ledger").insert({
      company_id: ctx.companyId,
      employee_id: request.employee_id,
      leave_type_id: request.leave_type_id,
      transaction_type: "used",
      days: request.total_days,
      reference_id: requestId,
      transaction_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
      created_by: actorProfileId
    });

    await createLeaveNotification(
      admin,
      ctx.companyId,
      employee.userProfileId,
      actorProfileId,
      "leave_approved",
      "Leave approved",
      "Your leave request has been approved.",
      requestId
    );

    return { ok: true, data: { status: "approved" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave approval error" };
  }
};

export const uploadLeaveRequestAttachment = async (
  ctx: ServiceContext,
  employeeId: string,
  leaveRequestId: string,
  file: File
): Promise<ServiceResult<{ attachmentId: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    const identity = await ensureSelfOrManager(ctx, employeeId);
    const admin = createSupabaseAdminClient();

    if (!file || !file.name) {
      return { ok: false, error: "Attachment is required" };
    }

    if (file.size > LEAVE_ATTACHMENT_MAX_SIZE_BYTES) {
      return { ok: false, error: "Attachment must be 10 MB or smaller" };
    }

    const mimeType = file.type || "application/octet-stream";
    if (!LEAVE_ATTACHMENT_ALLOWED_TYPES.has(mimeType)) {
      return { ok: false, error: "Unsupported attachment type" };
    }

    const { data: leaveRequest, error: leaveRequestError } = await admin
      .from("leave_requests")
      .select("id, employee_id")
      .eq("id", leaveRequestId)
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .maybeSingle();

    if (leaveRequestError || !leaveRequest) {
      return { ok: false, error: "Leave request not found" };
    }

    const attachmentId = crypto.randomUUID();
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const storagePath = `${ctx.companyId}/${employeeId}/${leaveRequestId}/${attachmentId}/${sanitizedName}`;

    const { error: uploadError } = await admin.storage
      .from(LEAVE_ATTACHMENT_BUCKET)
      .upload(storagePath, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return { ok: false, error: "Unable to upload attachment" };
    }

    const { error: insertError } = await admin.from("leave_request_attachments").insert({
      id: attachmentId,
      company_id: ctx.companyId,
      leave_request_id: leaveRequestId,
      employee_id: employeeId,
      file_name: sanitizedName,
      storage_bucket: LEAVE_ATTACHMENT_BUCKET,
      storage_path: storagePath,
      storage_mime_type: mimeType,
      storage_size: file.size,
      storage_checksum: null,
      uploaded_by: identity.actorProfileId,
    });

    if (insertError) {
      await admin.storage.from(LEAVE_ATTACHMENT_BUCKET).remove([storagePath]);
      return { ok: false, error: "Unable to save attachment metadata" };
    }

    return { ok: true, data: { attachmentId } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to upload attachment" };
  }
};

export const rejectLeave = async (
  ctx: ServiceContext,
  requestId: string,
  reason?: string
): Promise<ServiceResult<{ status: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    if (!hasLeaveReviewAuthority(ctx)) {
      requirePermission("manage_employees", ctx);
    }

    const approverProfileId = await getActorProfileId(ctx.supabase, ctx);
    const actorEmployeeId = await getActorEmployeeId(ctx.supabase, ctx);
    const admin = createSupabaseAdminClient();
    const directory = await loadApprovalDirectory(ctx, admin);

    const { data: request, error: requestError } = await admin
      .from("leave_requests")
      .select("id, employee_id, status, approval_level")
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .maybeSingle();

    if (requestError) {
      return { ok: false, error: sanitizeError(requestError.message, "Leave rejection failed") };
    }

    if (!request) {
      return { ok: false, error: "Leave request not found" };
    }

    if (request.status !== "pending") {
      return { ok: false, error: "Leave request already processed" };
    }

    ensureActorCanReviewRequest(
      ctx,
      actorEmployeeId,
      {
        employee_id: request.employee_id as string,
        approval_level: (request.approval_level as number | null) ?? 1
      },
      directory
    );

    const { error } = await admin
      .from("leave_requests")
      .update({
        status: "rejected",
        final_approved: false,
        approved_at: new Date().toISOString(),
        approved_by: approverProfileId,
        updated_by: approverProfileId
      })
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .eq("status", "pending");

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave rejection failed") };
    }

    const employee = directory.get(request.employee_id as string) ?? null;
    await createLeaveNotification(
      admin,
      ctx.companyId,
      employee?.userProfileId ?? null,
      approverProfileId,
      "leave_rejected",
      "Leave rejected",
      reason ? `Leave rejected: ${reason}` : "Your leave request has been rejected.",
      requestId
    );

    return { ok: true, data: { status: "rejected" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave rejection error" };
  }
};

export const cancelLeaveRequest = async (
  ctx: ServiceContext,
  requestId: string,
  employeeId: string
): Promise<ServiceResult<{ status: string }>> => {
  try {
    await requireLeaveEntitlement(ctx);
    assertEmployeeScope(employeeId, ctx);
    const identity = await ensureSelfOrManager(ctx, employeeId);

    const admin = createSupabaseAdminClient();
    const directory = await loadApprovalDirectory(ctx, admin);
    const { data: request, error: requestError } = await admin
      .from("leave_requests")
      .select("id, status, approval_level")
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .maybeSingle();

    if (requestError) {
      return { ok: false, error: sanitizeError(requestError.message, "Leave cancellation failed") };
    }

    if (!request) {
      return { ok: false, error: "Leave request not found" };
    }

    if (request.status !== "pending") {
      return { ok: false, error: "Only pending requests can be cancelled" };
    }

    if (!identity.isSelf) {
      ensureActorCanReviewRequest(
        ctx,
        identity.actorEmployeeId,
        {
          employee_id: employeeId,
          approval_level: (request.approval_level as number | null) ?? 1
        },
        directory
      );
    }

    const approval = resolveCurrentApprovalStep(
      {
        employee_id: employeeId,
        approval_level: (request.approval_level as number | null) ?? 1
      },
      directory
    );

    const { error } = await admin
      .from("leave_requests")
      .update({
        status: "cancelled",
        final_approved: false,
        updated_by: identity.actorProfileId
      })
      .eq("id", requestId)
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .eq("status", "pending");

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Leave cancellation failed") };
    }

    const employee = directory.get(employeeId) ?? null;
    const actorIsSelf = identity.isSelf;

    await createLeaveNotification(
      admin,
      ctx.companyId,
      employee?.userProfileId ?? null,
      identity.actorProfileId,
      "leave_cancelled",
      "Leave request cancelled",
      actorIsSelf
        ? "Your leave request has been cancelled."
        : "Your leave request was cancelled by the current reviewer.",
      requestId
    );

    if (actorIsSelf && approval.currentStep?.userProfileId) {
      await createLeaveNotification(
        admin,
        ctx.companyId,
        approval.currentStep.userProfileId,
        identity.actorProfileId,
        "leave_cancelled",
        "Leave request cancelled by employee",
        employee?.fullName ? `${employee.fullName} cancelled a pending leave request.` : "A pending leave request was cancelled by the employee.",
        requestId
      );
    }

    return { ok: true, data: { status: "cancelled" } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Leave cancellation error" };
  }
};
