"use client";

type EmployeeFiltersProps = {
  query: string;
  departmentId: string;
  status: string;
  onQueryChange: (value: string) => void;
  onDepartmentIdChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export const EmployeeFilters = ({
  query,
  departmentId,
  status,
  onQueryChange,
  onDepartmentIdChange,
  onStatusChange
}: EmployeeFiltersProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(180px,0.65fr)_minmax(180px,0.65fr)]">
      <label className="flex min-w-0 flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Search people</span>
        <input
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Name, employee code, status, or level"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Department</span>
        <input
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          value={departmentId}
          onChange={(event) => onDepartmentIdChange(event.target.value)}
          placeholder="department uuid"
        />
      </label>
      <label className="flex min-w-0 flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</span>
        <select
          className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
        >
          <option value="">All</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Terminated">Terminated</option>
        </select>
      </label>
    </div>
  );
};
