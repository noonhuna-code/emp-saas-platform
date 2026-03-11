"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchOrgChart } from "@/lib/client/api";
import type { OrgChartNode, OrgChartResponse } from "@/lib/types/org";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

const filterTree = (nodes: OrgChartNode[], query: string): OrgChartNode[] => {
  if (!query.trim()) return nodes;
  const term = query.toLowerCase();
  const filterNode = (node: OrgChartNode): OrgChartNode | null => {
    const matches = node.full_name.toLowerCase().includes(term);
    const children = (node.reports ?? []).map(filterNode).filter(Boolean) as OrgChartNode[];
    if (matches || children.length > 0) {
      return { ...node, reports: children };
    }
    return null;
  };
  return nodes.map(filterNode).filter(Boolean) as OrgChartNode[];
};

const OrgChartNodeView = ({
  node,
  expanded,
  toggle
}: {
  node: OrgChartNode;
  expanded: Set<string>;
  toggle: (id: string) => void;
}) => {
  const hasReports = Boolean(node.reports && node.reports.length > 0);
  const isOpen = expanded.has(node.id);

  return (
    <div className="org-node">
      <div className="org-node__header" onClick={() => hasReports && toggle(node.id)}>
        <div>
          <strong>{node.full_name}</strong>
          <div className="muted" style={{ fontSize: 12 }}>{node.designation ?? "Employee"}</div>
        </div>
        {hasReports ? <span className="tag">{isOpen ? "Hide" : "Show"} reports</span> : <span className="muted">No reports</span>}
      </div>
      {hasReports && isOpen ? (
        <div className="org-node__children">
          {node.reports?.map((child) => (
            <OrgChartNodeView key={child.id} node={child} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export const OrgChartView = () => {
  const [data, setData] = useState<OrgChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchOrgChart()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load org chart");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load org chart");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredDepartments = useMemo(() => {
    if (!data) return [] as OrgChartResponse["departments"];
    return data.departments.map((dept) => ({
      ...dept,
      nodes: filterTree(dept.nodes, query)
    }));
  }, [data, query]);

  const filteredUnassigned = useMemo(() => {
    if (!data) return [] as OrgChartNode[];
    return filterTree(data.unassigned, query);
  }, [data, query]);

  if (loading) {
    return <LoadingState label="Loading org chart..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "Org chart unavailable"} />;
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h1>Org Chart</h1>
          <p className="muted">Explore reporting lines and department structure.</p>
        </div>
        <input
          placeholder="Search employee"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ minWidth: 220 }}
          aria-label="Search employees"
        />
      </div>

      {filteredDepartments.map((dept) => (
        <section key={dept.id} className="card stack">
          <h3>{dept.name}</h3>
          <div className="org-tree">
            {dept.nodes.length === 0 ? <p className="muted">No matching employees.</p> : null}
            {dept.nodes.map((node) => (
              <OrgChartNodeView key={node.id} node={node} expanded={expanded} toggle={toggle} />
            ))}
          </div>
        </section>
      ))}

      <section className="card stack">
        <h3>Unassigned</h3>
        <div className="org-tree">
          {filteredUnassigned.length === 0 ? <p className="muted">No matching employees.</p> : null}
          {filteredUnassigned.map((node) => (
            <OrgChartNodeView key={node.id} node={node} expanded={expanded} toggle={toggle} />
          ))}
        </div>
      </section>
    </div>
  );
};
