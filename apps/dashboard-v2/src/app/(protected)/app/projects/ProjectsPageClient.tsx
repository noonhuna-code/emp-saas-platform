"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchProjectTasks, fetchProjects } from "@/lib/client/api";
import type { ProjectSummaryRow, ProjectTaskSummaryRow } from "@/lib/types/projects";
import {
  DashboardRail,
  FeatureCallout,
  OverviewChips,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusChip } from "@/components/ui/StatusChip";
import { resolveDashboardPersona } from "@/lib/dashboard/capabilities";

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const statusTone = (status: string): "default" | "info" | "warning" | "danger" | "success" => {
  if (status === "active" || status === "in_progress") return "info";
  if (status === "completed" || status === "done") return "success";
  if (status === "blocked" || status === "archived") return "danger";
  if (status === "on_hold") return "warning";
  return "default";
};

const ProjectsPageClient = ({
  role,
  permissions,
}: {
  role: string | null;
  permissions: string[];
}) => {
  const [projects, setProjects] = useState<ProjectSummaryRow[]>([]);
  const [tasks, setTasks] = useState<ProjectTaskSummaryRow[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const persona = resolveDashboardPersona({ role, permissions });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [projectsResult, tasksResult] = await Promise.all([
        fetchProjects({ limit: 12 }),
        fetchProjectTasks({ limit: 40 }),
      ]);

      if (!projectsResult.ok || !projectsResult.data) {
        setError(projectsResult.error ?? "Unable to load projects");
        setProjects([]);
        setTasks([]);
        return;
      }

      setProjects(projectsResult.data.rows);
      if (projectsResult.data.rows[0] && !selectedProjectId) {
        setSelectedProjectId(projectsResult.data.rows[0].id);
      }

      if (tasksResult.ok && tasksResult.data) {
        setTasks(tasksResult.data.rows);
      } else {
        setTasks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load projects");
      setProjects([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedProject = useMemo(
    () => projects.find((row) => row.id === selectedProjectId) ?? projects[0] ?? null,
    [projects, selectedProjectId]
  );

  const visibleTasks = useMemo(() => {
    if (!selectedProject) return tasks;
    return tasks.filter((task) => task.project_id === selectedProject.id);
  }, [selectedProject, tasks]);

  const stats = useMemo(() => {
    const active = projects.filter((row) => row.status === "active").length;
    const blocked = tasks.filter((row) => row.status === "blocked").length;
    const memberCount = projects.reduce((sum, row) => sum + row.member_count, 0);
    return {
      totalProjects: projects.length,
      activeProjects: active,
      blockedTasks: blocked,
      memberCount,
    };
  }, [projects, tasks]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Projects"
        title="Execution, staffing, and ownership"
        description="Use one read-safe workspace to understand project load, task pressure, and who currently owns delivery across the company."
        chips={["Portfolio view", "Task pressure", "Read-safe staffing", "Workflow context"]}
        actions={(
          <>
            <Link href="/app/dashboard" className="secondary-btn">Dashboard</Link>
            <Link href="/app/approvals" className="secondary-btn">Approvals</Link>
          </>
        )}
      />

      <FeatureCallout
        badge="Execution"
        title="Projects belong inside the operating system, not off to the side."
        description={`This view is tuned for ${persona.replace("_", " ")} workflows: portfolio visibility, task pressure, and staffing context without breaking the existing project service layer.`}
      />

      <StatGrid>
        <StatCard label="Projects" value={stats.totalProjects} hint="Visible portfolio count" />
        <StatCard label="Active" value={stats.activeProjects} hint="Projects currently in active delivery" />
        <StatCard label="Blocked tasks" value={stats.blockedTasks} hint="Tasks explicitly marked blocked" />
        <StatCard label="Assigned members" value={stats.memberCount} hint="Total members across visible projects" />
      </StatGrid>

      {loading ? <LoadingState label="Loading projects workspace..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}

      {!loading && !error ? (
        <DashboardRail>
          <SurfacePanel title="Project portfolio" description="A read-only portfolio view with member and task pressure in one place.">
            {projects.length === 0 ? (
              <EmptyState
                title="No projects visible yet"
                subtitle="Project delivery surfaces will appear here as soon as a project is created for this tenant."
                compact
              />
            ) : (
              <div className="space-y-3">
                {projects.map((project) => {
                  const isActive = selectedProject?.id === project.id;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                        isActive
                          ? "border-blue-300 bg-blue-50/80 shadow-sm"
                          : "border-slate-200/80 bg-white/92 hover:border-slate-300"
                      }`}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">{project.name}</p>
                          <p className="text-xs text-slate-500">
                            Owner {project.owner_name ?? project.owner_employee_code ?? "Unassigned"} | Started {formatDate(project.start_date)}
                          </p>
                        </div>
                        <StatusChip label={project.status.replace("_", " ")} tone={statusTone(project.status)} compact />
                      </div>
                      {project.description ? <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p> : null}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <StatusChip label={`${project.member_count} members`} compact />
                        <StatusChip label={`${project.task_counts.total} tasks`} compact />
                        {project.task_counts.blocked > 0 ? <StatusChip label={`${project.task_counts.blocked} blocked`} tone="danger" compact /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SurfacePanel>

          <div className="space-y-6">
            <SurfacePanel title="Selected project" description="Task queue and working context for the currently selected project.">
              {selectedProject ? (
                <div className="space-y-4">
                  <OverviewChips
                    chips={[
                      selectedProject.status.replace("_", " "),
                      `${selectedProject.member_count} members`,
                      `${selectedProject.task_counts.total} tasks`,
                      selectedProject.end_date ? `Ends ${formatDate(selectedProject.end_date)}` : "No end date",
                    ]}
                  />
                  <p className="text-sm leading-6 text-slate-600">
                    {selectedProject.description ?? "No project description has been recorded yet."}
                  </p>
                </div>
              ) : (
                <EmptyState title="Select a project" subtitle="Choose a project from the portfolio list to inspect task pressure." compact />
              )}
            </SurfacePanel>

            <SurfacePanel title="Task pressure" description="Recent tasks for the selected project or the broader portfolio.">
              {visibleTasks.length === 0 ? (
                <EmptyState title="No tasks available" subtitle="Tasks will appear here once the selected project has active work items." compact />
              ) : (
                <div className="space-y-3">
                  {visibleTasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-950">{task.title}</p>
                          <p className="text-xs text-slate-500">
                            {task.project_name ?? "Project"} | Assignee {task.assignee_name ?? task.assignee_employee_code ?? "Unassigned"}
                          </p>
                        </div>
                        <StatusChip label={task.status.replace("_", " ")} tone={statusTone(task.status)} compact />
                      </div>
                      {task.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{task.description}</p> : null}
                      <p className="mt-3 text-xs text-slate-500">Due {formatDate(task.due_date)}</p>
                    </div>
                  ))}
                </div>
              )}
            </SurfacePanel>
          </div>
        </DashboardRail>
      ) : null}
    </PageContainer>
  );
};

export default ProjectsPageClient;
