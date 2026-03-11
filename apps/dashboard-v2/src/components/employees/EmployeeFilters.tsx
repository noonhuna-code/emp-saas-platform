"use client";

type EmployeeFiltersProps = {
  departmentId: string;
  status: string;
  onDepartmentIdChange: (value: string) => void;
  onStatusChange: (value: string) => void;
};

export const EmployeeFilters = ({
  departmentId,
  status,
  onDepartmentIdChange,
  onStatusChange
}: EmployeeFiltersProps) => {
  return (
    <div className="card row" style={{ flexWrap: "wrap" }}>
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
