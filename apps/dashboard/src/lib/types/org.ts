export type OrgChartNode = {
  id: string;
  full_name: string;
  designation?: string | null;
  department_id?: string | null;
  team_id?: string | null;
  manager_id?: string | null;
  reports?: OrgChartNode[];
};

export type OrgChartDepartment = {
  id: string;
  name: string;
  nodes: OrgChartNode[];
};

export type OrgChartResponse = {
  departments: OrgChartDepartment[];
  unassigned: OrgChartNode[];
};
