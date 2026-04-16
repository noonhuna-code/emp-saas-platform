"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { fetchEmployees } from "@/lib/client/api";
import type { EmployeeDirectoryRow } from "@/lib/types/employees";
import { EmployeeFilters } from "./EmployeeFilters";
import { EmployeeTable } from "./EmployeeTable";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const EmployeeDirectoryScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<EmployeeDirectoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(searchQuery);

  const requestQuery = useMemo(() => ({
    query: deferredQuery.trim() || undefined,
    departmentId: departmentId || undefined,
    status: status || undefined,
    page: 1,
    pageSize: 25
  }), [deferredQuery, departmentId, status]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchEmployees(requestQuery)
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load employees");
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(result.data.rows);
        setTotal(result.data.total);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load employees");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestQuery]);

  return (
    <div className="page-wrap stack">
      <section className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0 }}>Employee Directory</h1>
            <p className="muted" style={{ margin: "6px 0 0" }}>Company-scoped directory with server-backed search for people, employee codes, statuses, and job levels.</p>
          </div>
          <span className="badge">Total: {total}</span>
        </div>
      </section>

      <EmployeeFilters
        query={searchQuery}
        departmentId={departmentId}
        status={status}
        onQueryChange={setSearchQuery}
        onDepartmentIdChange={setDepartmentId}
        onStatusChange={setStatus}
      />

      {loading ? <LoadingState label={deferredQuery.trim() ? "Searching employees..." : "Loading employees..."} /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No employees found"
          subtitle={deferredQuery.trim()
            ? "Try a broader person search or adjust the department and status filters."
            : "Adjust filters or verify company permissions in the auth context resolver."}
        />
      ) : null}
      {!loading && !error && rows.length > 0 ? <EmployeeTable rows={rows} /> : null}
    </div>
  );
};
