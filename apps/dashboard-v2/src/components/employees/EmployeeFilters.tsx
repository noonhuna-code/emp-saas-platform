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
    <div className="card row" style={{ flexWrap: "wrap" }}>
      <label style={{ minWidth: 260, flex: "1 1 320px" }}>
        <span className="muted">Search people</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Name, employee code, status, or level"
        />
      </label>
      <label>
        <span className="muted">Department</span>
        <input
          value={departmentId}
          onChange={(event) => onDepartmentIdChange(event.target.value)}
          placeholder="department uuid"
        />
      </label>
      <label>
        <span className="muted">Status</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="">All</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Terminated">Terminated</option>
        </select>
      </label>
    </div>
  );
};
