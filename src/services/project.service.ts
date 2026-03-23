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

export type ProjectSummaryRow = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "on_hold" | "completed" | "archived";
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  owner_employee_id: string | null;
  owner_name: string | null;
  owner_employee_code: string | null;
  member_count: number;
  task_counts: {
    total: number;
    todo: number;
    in_progress: number;
    blocked: number;
    done: number;
  };
};

export type ProjectTaskSummaryRow = {
  id: string;
  project_id: string;
  project_name: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "blocked" | "done";
  due_date: string | null;
  created_at: string | null;
  assignee_employee_id: string | null;
  assignee_name: string | null;
  assignee_employee_code: string | null;
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

const MAX_PROJECTS_LIMIT = 50;
const MAX_TASKS_LIMIT = 200;

export const listProjects = async (
  ctx: ServiceContext,
  options?: { limit?: number }
): Promise<ServiceResult<{ rows: ProjectSummaryRow[] }>> => {
  try {
    await requireProjectEntitlement(ctx);
    requirePermission("manage_projects", ctx);

    const limit = Math.max(1, Math.min(options?.limit ?? 12, MAX_PROJECTS_LIMIT));
    const { data: projectRows, error: projectError } = await ctx.supabase
      .from("projects")
      .select("id, name, description, status, start_date, end_date, created_at, owner_employee_id")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (projectError) {
      return { ok: false, error: sanitizeError(projectError.message, "Unable to load projects") };
    }

    const projects = (projectRows ?? []) as Array<Record<string, unknown>>;
    if (projects.length === 0) {
      return { ok: true, data: { rows: [] } };
    }

    const projectIds = projects.map((row) => row.id as string);
    const ownerIds = Array.from(
      new Set(projects.map((row) => row.owner_employee_id as string | null).filter((value): value is string => Boolean(value)))
    );

    const [memberRowsResult, taskRowsResult, ownerRowsResult] = await Promise.all([
      ctx.supabase
        .from("project_members")
        .select("project_id")
        .eq("company_id", ctx.companyId)
        .in("project_id", projectIds)
        .is("is_deleted", false),
      ctx.supabase
        .from("project_tasks")
        .select("project_id, status")
        .eq("company_id", ctx.companyId)
        .in("project_id", projectIds)
        .is("is_deleted", false),
      ownerIds.length
        ? ctx.supabase
            .from("employees")
            .select("id, employee_code, user_profile_id")
            .eq("company_id", ctx.companyId)
            .in("id", ownerIds)
            .is("is_deleted", false)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (memberRowsResult.error) {
      return { ok: false, error: sanitizeError(memberRowsResult.error.message, "Unable to load project members") };
    }
    if (taskRowsResult.error) {
      return { ok: false, error: sanitizeError(taskRowsResult.error.message, "Unable to load project tasks") };
    }
    if (ownerRowsResult.error) {
      return { ok: false, error: sanitizeError(ownerRowsResult.error.message, "Unable to load project owners") };
    }

    const ownerRows = (ownerRowsResult.data ?? []) as Array<Record<string, unknown>>;
    const profileIds = Array.from(
      new Set(ownerRows.map((row) => row.user_profile_id as string | null).filter((value): value is string => Boolean(value)))
    );

    const ownerProfilesResult = profileIds.length
      ? await ctx.supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("company_id", ctx.companyId)
          .in("id", profileIds)
          .is("is_deleted", false)
      : { data: [], error: null };

    if (ownerProfilesResult.error) {
      return { ok: false, error: sanitizeError(ownerProfilesResult.error.message, "Unable to load project owners") };
    }

    const memberCountByProject = new Map<string, number>();
    for (const row of (memberRowsResult.data ?? []) as Array<Record<string, unknown>>) {
      const projectId = row.project_id as string;
      memberCountByProject.set(projectId, (memberCountByProject.get(projectId) ?? 0) + 1);
    }

    const taskCountsByProject = new Map<string, ProjectSummaryRow["task_counts"]>();
    for (const row of (taskRowsResult.data ?? []) as Array<Record<string, unknown>>) {
      const projectId = row.project_id as string;
      const status = (row.status as ProjectTaskSummaryRow["status"]) ?? "todo";
      const current = taskCountsByProject.get(projectId) ?? {
        total: 0,
        todo: 0,
        in_progress: 0,
        blocked: 0,
        done: 0
      };
      current.total += 1;
      current[status] += 1;
      taskCountsByProject.set(projectId, current);
    }

    const profileById = new Map<string, string | null>();
    for (const profile of (ownerProfilesResult.data ?? []) as Array<Record<string, unknown>>) {
      profileById.set(profile.id as string, (profile.full_name as string | null) ?? null);
    }

    const ownerById = new Map<string, { employee_code: string | null; full_name: string | null }>();
    for (const owner of ownerRows) {
      ownerById.set(owner.id as string, {
        employee_code: (owner.employee_code as string | null) ?? null,
        full_name: profileById.get(owner.user_profile_id as string) ?? null
      });
    }

    return {
      ok: true,
      data: {
        rows: projects.map((project) => {
          const projectId = project.id as string;
          const ownerId = (project.owner_employee_id as string | null) ?? null;
          const owner = ownerId ? ownerById.get(ownerId) : null;

          return {
            id: projectId,
            name: project.name as string,
            description: (project.description as string | null) ?? null,
            status: (project.status as ProjectSummaryRow["status"]) ?? "active",
            start_date: (project.start_date as string | null) ?? null,
            end_date: (project.end_date as string | null) ?? null,
            created_at: (project.created_at as string | null) ?? null,
            owner_employee_id: ownerId,
            owner_name: owner?.full_name ?? null,
            owner_employee_code: owner?.employee_code ?? null,
            member_count: memberCountByProject.get(projectId) ?? 0,
            task_counts: taskCountsByProject.get(projectId) ?? {
              total: 0,
              todo: 0,
              in_progress: 0,
              blocked: 0,
              done: 0
            }
          };
        })
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load projects" };
  }
};

export const listProjectTasks = async (
  ctx: ServiceContext,
  options?: { limit?: number; projectId?: string | null }
): Promise<ServiceResult<{ rows: ProjectTaskSummaryRow[] }>> => {
  try {
    await requireProjectEntitlement(ctx);
    requirePermission("manage_projects", ctx);

    const limit = Math.max(1, Math.min(options?.limit ?? 60, MAX_TASKS_LIMIT));
    let query = ctx.supabase
      .from("project_tasks")
      .select("id, project_id, title, description, status, due_date, created_at, assignee_employee_id")
      .eq("company_id", ctx.companyId)
      .is("is_deleted", false)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (options?.projectId) {
      query = query.eq("project_id", options.projectId);
    }

    const { data: taskRows, error: taskError } = await query;
    if (taskError) {
      return { ok: false, error: sanitizeError(taskError.message, "Unable to load project tasks") };
    }

    const tasks = (taskRows ?? []) as Array<Record<string, unknown>>;
    if (tasks.length === 0) {
      return { ok: true, data: { rows: [] } };
    }

    const projectIds = Array.from(new Set(tasks.map((row) => row.project_id as string)));
    const assigneeIds = Array.from(
      new Set(tasks.map((row) => row.assignee_employee_id as string | null).filter((value): value is string => Boolean(value)))
    );

    const [projectRowsResult, assigneeRowsResult] = await Promise.all([
      ctx.supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", ctx.companyId)
        .in("id", projectIds)
        .is("is_deleted", false),
      assigneeIds.length
        ? ctx.supabase
            .from("employees")
            .select("id, employee_code, user_profile_id")
            .eq("company_id", ctx.companyId)
            .in("id", assigneeIds)
            .is("is_deleted", false)
        : Promise.resolve({ data: [], error: null })
    ]);

    if (projectRowsResult.error) {
      return { ok: false, error: sanitizeError(projectRowsResult.error.message, "Unable to load projects") };
    }
    if (assigneeRowsResult.error) {
      return { ok: false, error: sanitizeError(assigneeRowsResult.error.message, "Unable to load task assignees") };
    }

    const assigneeRows = (assigneeRowsResult.data ?? []) as Array<Record<string, unknown>>;
    const profileIds = Array.from(
      new Set(assigneeRows.map((row) => row.user_profile_id as string | null).filter((value): value is string => Boolean(value)))
    );

    const assigneeProfilesResult = profileIds.length
      ? await ctx.supabase
          .from("user_profiles")
          .select("id, full_name")
          .eq("company_id", ctx.companyId)
          .in("id", profileIds)
          .is("is_deleted", false)
      : { data: [], error: null };

    if (assigneeProfilesResult.error) {
      return { ok: false, error: sanitizeError(assigneeProfilesResult.error.message, "Unable to load task assignees") };
    }

    const projectNameById = new Map<string, string | null>();
    for (const project of (projectRowsResult.data ?? []) as Array<Record<string, unknown>>) {
      projectNameById.set(project.id as string, (project.name as string | null) ?? null);
    }

    const profileById = new Map<string, string | null>();
    for (const profile of (assigneeProfilesResult.data ?? []) as Array<Record<string, unknown>>) {
      profileById.set(profile.id as string, (profile.full_name as string | null) ?? null);
    }

    const assigneeById = new Map<string, { employee_code: string | null; full_name: string | null }>();
    for (const assignee of assigneeRows) {
      assigneeById.set(assignee.id as string, {
        employee_code: (assignee.employee_code as string | null) ?? null,
        full_name: profileById.get(assignee.user_profile_id as string) ?? null
      });
    }

    return {
      ok: true,
      data: {
        rows: tasks.map((task) => {
          const assigneeId = (task.assignee_employee_id as string | null) ?? null;
          const assignee = assigneeId ? assigneeById.get(assigneeId) : null;
          return {
            id: task.id as string,
            project_id: task.project_id as string,
            project_name: projectNameById.get(task.project_id as string) ?? null,
            title: task.title as string,
            description: (task.description as string | null) ?? null,
            status: (task.status as ProjectTaskSummaryRow["status"]) ?? "todo",
            due_date: (task.due_date as string | null) ?? null,
            created_at: (task.created_at as string | null) ?? null,
            assignee_employee_id: assigneeId,
            assignee_name: assignee?.full_name ?? null,
            assignee_employee_code: assignee?.employee_code ?? null
          };
        })
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Unable to load project tasks" };
  }
};
