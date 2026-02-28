import type { ServiceContext, ServiceResult } from "../lib/types";
import { requirePermission } from "../lib/auth-wrapper";
import { getPlanLimit, requirePlanFeature } from "../lib/entitlements";

export type ProjectPayload = {
  name: string;
  description?: string | null;
  owner_employee_id?: string | null;
  status?: "active" | "on_hold" | "completed" | "archived";
  start_date?: string | null;
  end_date?: string | null;
};

export type ProjectTaskPayload = {
  title: string;
  description?: string | null;
  assignee_employee_id?: string | null;
  status?: "todo" | "in_progress" | "blocked" | "done";
  due_date?: string | null;
};

const sanitizeError = (message: string, fallback: string): string => {
  if (!message) return fallback;
  if (message === "UNAUTHENTICATED") return "Authentication required";
  if (message === "TENANT_RESOLUTION_FAILED" || message === "ACTOR_MISMATCH") return "Permission denied";
  if (message === "TASK_NOT_FOUND") return "Task not found";
  if (message === "NOT_PROJECT_MEMBER") return "Permission denied";
  if (message === "NO_STATUS_CHANGE") return "No status change";
  if (message === "INVALID_INPUT") return "Invalid input";
  return fallback;
};

const requireProjectEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.project_management_core");
};

const enforceProjectsLimit = async (ctx: ServiceContext): Promise<void> => {
  const maxProjects = await getPlanLimit(ctx, "limit.projects_max");
  if (maxProjects === null) return;

  const { count, error } = await ctx.supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.companyId)
    .is("is_deleted", false)
    .neq("status", "archived");

  if (error) {
    throw new Error("Unable to validate projects limit");
  }

  if ((count ?? 0) >= maxProjects) {
    throw new Error("Project limit reached for current plan");
  }
};

export const createProject = async (
  ctx: ServiceContext,
  payload: ProjectPayload
): Promise<ServiceResult<{ project_id: string; owner_member_id: string }>> => {
  try {
    await requireProjectEntitlement(ctx);
    requirePermission("manage_projects", ctx);
    await enforceProjectsLimit(ctx);

    const { data, error } = await ctx.supabase.rpc("create_project_atomic", {
      p_name: payload.name,
      p_description: payload.description ?? null,
      p_owner_employee_id: payload.owner_employee_id ?? null,
      p_status: payload.status ?? "active",
      p_start_date: payload.start_date ?? null,
      p_end_date: payload.end_date ?? null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Project creation failed") };
    }

    return { ok: true, data: data as { project_id: string; owner_member_id: string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Project creation failed" };
  }
};

export const addProjectMember = async (
  ctx: ServiceContext,
  projectId: string,
  employeeId: string,
  role: string = "member"
): Promise<ServiceResult<{ member_id: string }>> => {
  try {
    await requireProjectEntitlement(ctx);
    requirePermission("manage_projects", ctx);

    const { data, error } = await ctx.supabase.rpc("add_project_member_atomic", {
      p_project_id: projectId,
      p_employee_id: employeeId,
      p_role: role
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Failed to add project member") };
    }

    return { ok: true, data: data as { member_id: string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to add project member" };
  }
};

export const createTask = async (
  ctx: ServiceContext,
  projectId: string,
  payload: ProjectTaskPayload
): Promise<ServiceResult<{ task_id: string; status_history_id: string }>> => {
  try {
    await requireProjectEntitlement(ctx);
    requirePermission("manage_projects", ctx);

    const { data, error } = await ctx.supabase.rpc("create_project_task_atomic", {
      p_project_id: projectId,
      p_title: payload.title,
      p_description: payload.description ?? null,
      p_assignee_employee_id: payload.assignee_employee_id ?? null,
      p_status: payload.status ?? "todo",
      p_due_date: payload.due_date ?? null
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Task creation failed") };
    }

    return { ok: true, data: data as { task_id: string; status_history_id: string } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Task creation failed" };
  }
};

export const updateTaskStatus = async (
  ctx: ServiceContext,
  taskId: string,
  status: "todo" | "in_progress" | "blocked" | "done"
): Promise<ServiceResult<{ task_id: string; old_status: string; new_status: string; status_history_id: string }>> => {
  try {
    await requireProjectEntitlement(ctx);
    requirePermission("manage_projects", ctx);

    const { data, error } = await ctx.supabase.rpc("update_project_task_status_atomic", {
      p_task_id: taskId,
      p_new_status: status
    });

    if (error) {
      return { ok: false, error: sanitizeError(error.message, "Task update failed") };
    }

    return {
      ok: true,
      data: data as { task_id: string; old_status: string; new_status: string; status_history_id: string }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Task update failed" };
  }
};
