import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePlanFeature } from "../lib/entitlements";

export type WorkspaceResourceRow = {
  id: string;
  title: string;
  resource_type: string;
  summary: string | null;
  link_url: string | null;
  file_url: string | null;
  created_at: string;
};

export type WorkspaceNoteRow = {
  id: string;
  title: string;
  body: string;
  file_url: string | null;
  file_name: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkspaceChatRow = {
  id: string;
  sender_employee_id: string;
  recipient_employee_id: string;
  sender_name: string | null;
  recipient_name: string | null;
  message_text: string;
  created_at: string;
  direction: "in" | "out";
};

export type WorkspaceContactRow = {
  employee_id: string;
  full_name: string | null;
  employee_code: string | null;
  designation: string | null;
  department_name: string | null;
  team_name: string | null;
  avatar_url: string | null;
  is_team_lead: boolean;
  is_self: boolean;
};

export type WorkspaceNotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

const sanitizeError = (message: string | undefined, fallback: string): string => {
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (message === "UNAUTHENTICATED" || lower.includes("jwt")) return "Authentication required";
  if (lower.includes("permission") || lower.includes("not allowed")) return "Permission denied";
  return fallback;
};

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

const requireWorkspaceAccess = async (ctx: ServiceContext): Promise<string> => {
  await requirePlanFeature(ctx, "feature.core_employee_management");
  const employeeId = await resolveCurrentEmployeeId(ctx);
  if (!employeeId) throw new Error("Employee record not found");
  return employeeId;
};

export const listWorkspaceResources = async (
  ctx: ServiceContext,
  limit = 30
): Promise<ServiceResult<{ rows: WorkspaceResourceRow[] }>> => {
  try {
    await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const { data, error } = await ctx.supabase
      .from("company_resources")
      .select("id, title, resource_type, summary, link_url, file_url, created_at")
      .eq("company_id", ctx.companyId)
      .eq("is_active", true)
      .is("is_deleted", false)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load resources") };

    return {
      ok: true,
      data: {
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          resource_type: row.resource_type as string,
          summary: (row.summary as string | null) ?? null,
          link_url: (row.link_url as string | null) ?? null,
          file_url: (row.file_url as string | null) ?? null,
          created_at: row.created_at as string
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load resources" };
  }
};

export const listWorkspaceNotes = async (
  ctx: ServiceContext,
  limit = 30
): Promise<ServiceResult<{ employeeId: string; rows: WorkspaceNoteRow[] }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const { data, error } = await ctx.supabase
      .from("employee_workspace_notes")
      .select("id, title, body, file_url, file_name, is_pinned, created_at, updated_at")
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(safeLimit);

    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load notes") };

    return {
      ok: true,
      data: {
        employeeId,
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          title: row.title as string,
          body: row.body as string,
          file_url: (row.file_url as string | null) ?? null,
          file_name: (row.file_name as string | null) ?? null,
          is_pinned: Boolean(row.is_pinned),
          created_at: row.created_at as string,
          updated_at: row.updated_at as string
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load notes" };
  }
};

export const createWorkspaceNote = async (
  ctx: ServiceContext,
  payload: {
    title: string;
    body: string;
    fileUrl?: string | null;
    fileName?: string | null;
    isPinned?: boolean;
  }
): Promise<ServiceResult<{ id: string }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);

    const title = payload.title?.trim();
    const body = payload.body?.trim();
    if (!title || !body) return { ok: false, error: "Title and body are required" };

    const { data, error } = await ctx.supabase
      .from("employee_workspace_notes")
      .insert({
        company_id: ctx.companyId,
        employee_id: employeeId,
        title,
        body,
        file_url: payload.fileUrl?.trim() || null,
        file_name: payload.fileName?.trim() || null,
        is_pinned: Boolean(payload.isPinned),
        created_by: ctx.userProfileId,
        updated_by: ctx.userProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to create note") };
    }

    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to create note" };
  }
};

export const listWorkspaceChatMessages = async (
  ctx: ServiceContext,
  filters: { peerEmployeeId?: string; limit?: number } = {}
): Promise<ServiceResult<{ employeeId: string; rows: WorkspaceChatRow[] }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    const employeeId = await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(filters.limit ?? 50, 200));

    let query = ctx.supabase
      .from("employee_chat_messages")
      .select("id, sender_employee_id, recipient_employee_id, message_text, created_at")
      .eq("company_id", ctx.companyId)
      .or(`sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${employeeId}`)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (filters.peerEmployeeId) {
      query = query.or(
        `and(sender_employee_id.eq.${employeeId},recipient_employee_id.eq.${filters.peerEmployeeId}),and(sender_employee_id.eq.${filters.peerEmployeeId},recipient_employee_id.eq.${employeeId})`
      );
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load chat") };

    const participantIds = Array.from(
      new Set((data ?? []).flatMap((row) => [row.sender_employee_id, row.recipient_employee_id]).filter(Boolean))
    ) as string[];

    const participantRows = participantIds.length
      ? await ctx.supabase
          .from("employees")
          .select("id, user_profiles(full_name)")
          .eq("company_id", ctx.companyId)
          .in("id", participantIds)
          .is("is_deleted", false)
      : { data: [] as any[] };

    const nameByEmployeeId = new Map<string, string | null>(
      (participantRows.data ?? []).map((row: any) => [row.id as string, (row.user_profiles?.full_name as string | null) ?? null])
    );

    return {
      ok: true,
      data: {
        employeeId,
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          sender_employee_id: row.sender_employee_id as string,
          recipient_employee_id: row.recipient_employee_id as string,
          sender_name: nameByEmployeeId.get(row.sender_employee_id as string) ?? null,
          recipient_name: nameByEmployeeId.get(row.recipient_employee_id as string) ?? null,
          message_text: row.message_text as string,
          created_at: row.created_at as string,
          direction: (row.sender_employee_id as string) === employeeId ? "out" : "in"
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load chat" };
  }
};

export const sendWorkspaceChatMessage = async (
  ctx: ServiceContext,
  payload: {
    recipientEmployeeId: string;
    message: string;
  }
): Promise<ServiceResult<{ id: string }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    const senderEmployeeId = await requireWorkspaceAccess(ctx);
    const recipientEmployeeId = payload.recipientEmployeeId?.trim();
    const messageText = payload.message?.trim();

    if (!recipientEmployeeId) return { ok: false, error: "Recipient is required" };
    if (!messageText) return { ok: false, error: "Message is required" };

    const { data, error } = await ctx.supabase
      .from("employee_chat_messages")
      .insert({
        company_id: ctx.companyId,
        sender_employee_id: senderEmployeeId,
        recipient_employee_id: recipientEmployeeId,
        message_text: messageText,
        created_by: ctx.userProfileId
      })
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, error: sanitizeError(error?.message, "Unable to send message") };
    }

    return { ok: true, data: { id: data.id as string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to send message" };
  }
};

export const listWorkspaceContacts = async (
  ctx: ServiceContext,
  limit = 200
): Promise<ServiceResult<{ employeeId: string; rows: WorkspaceContactRow[] }>> => {
  try {
    const employeeId = await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(limit, 500));

    const { data: currentEmployee, error: currentError } = await ctx.supabase
      .from("employees")
      .select("id, manager_id, department_id, team_id")
      .eq("company_id", ctx.companyId)
      .eq("id", employeeId)
      .is("is_deleted", false)
      .maybeSingle();

    if (currentError || !currentEmployee?.id) {
      return { ok: false, error: sanitizeError(currentError?.message, "Unable to resolve employee scope") };
    }

    const { data, error } = await ctx.supabase
      .from("employees")
      .select(
        "id, employee_code, designation, user_profile_id, department_id, team_id, user_profiles(full_name, avatar_url), departments(name), teams(name)"
      )
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(safeLimit);

    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load contacts") };

    const managerId = (currentEmployee.manager_id as string | null) ?? null;
    const currentTeamId = (currentEmployee.team_id as string | null) ?? null;

    const contacts = (data ?? []).map((row: any) => {
      const rowTeamId = (row.team_id as string | null) ?? null;
      const isSelf = (row.id as string) === employeeId;
      const isTeamLead = managerId !== null && (row.id as string) === managerId;
      const isTeamPeer = currentTeamId !== null && rowTeamId === currentTeamId;
      return {
        employee_id: row.id as string,
        full_name: (row.user_profiles?.full_name as string | null) ?? null,
        employee_code: (row.employee_code as string | null) ?? null,
        designation: (row.designation as string | null) ?? null,
        department_name: (row.departments?.name as string | null) ?? null,
        team_name: (row.teams?.name as string | null) ?? null,
        avatar_url: (row.user_profiles?.avatar_url as string | null) ?? null,
        is_team_lead: isTeamLead,
        is_self: isSelf,
        priority: isSelf ? 0 : isTeamLead ? 1 : isTeamPeer ? 2 : 3
      };
    });

    contacts.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return (a.full_name ?? "").localeCompare(b.full_name ?? "");
    });

    return {
      ok: true,
      data: {
        employeeId,
        rows: contacts.map(({ priority, ...contact }) => contact)
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load contacts" };
  }
};

export const listWorkspaceNotifications = async (
  ctx: ServiceContext,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<ServiceResult<{ rows: WorkspaceNotificationRow[] }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    await requireWorkspaceAccess(ctx);
    const safeLimit = Math.max(1, Math.min(options.limit ?? 50, 200));

    let query = ctx.supabase
      .from("notifications")
      .select("id, type, title, message, reference_type, reference_id, is_read, read_at, created_at")
      .eq("company_id", ctx.companyId)
      .eq("recipient_profile_id", ctx.userProfileId)
      .is("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(safeLimit);

    if (options.unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;
    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to load notifications") };

    return {
      ok: true,
      data: {
        rows: (data ?? []).map((row) => ({
          id: row.id as string,
          type: row.type as string,
          title: row.title as string,
          message: (row.message as string | null) ?? null,
          reference_type: (row.reference_type as string | null) ?? null,
          reference_id: (row.reference_id as string | null) ?? null,
          is_read: Boolean(row.is_read),
          read_at: (row.read_at as string | null) ?? null,
          created_at: row.created_at as string
        }))
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load notifications" };
  }
};

export const markWorkspaceNotificationsRead = async (
  ctx: ServiceContext,
  payload: { ids?: string[] } = {}
): Promise<ServiceResult<{ updated: number }>> => {
  try {
    await requirePlanFeature(ctx, "feature.core_notifications");
    await requireWorkspaceAccess(ctx);

    const ids = Array.from(new Set((payload.ids ?? []).map((id) => id.trim()).filter(Boolean)));
    let query = ctx.supabase
      .from("notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_by: ctx.userProfileId
      })
      .eq("company_id", ctx.companyId)
      .eq("recipient_profile_id", ctx.userProfileId)
      .eq("is_read", false)
      .is("is_deleted", false);

    if (ids.length > 0) {
      query = query.in("id", ids);
    }

    const { data, error } = await query.select("id");
    if (error) return { ok: false, error: sanitizeError(error.message, "Unable to update notifications") };

    return {
      ok: true,
      data: { updated: (data ?? []).length }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to update notifications" };
  }
};
