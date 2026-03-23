"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchEmployeeDetail } from "@/lib/client/api";
import type { EmployeeDetailResponse } from "@/lib/types/employees";
import { EmployeeDetailCard } from "./EmployeeDetailCard";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

export const EmployeeDetailScreen = ({ employeeId }: { employeeId: string }) => {
  const [data, setData] = useState<EmployeeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    void fetchEmployeeDetail(employeeId)
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to load employee detail");
          return;
        }
        setData(result.data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load employee detail");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [employeeId]);

  return (
    <div className="page-wrap stack">
      <Link className="secondary-btn" href="/app/employees" style={{ width: "fit-content" }}>
        Back to Employees
      </Link>
      {loading ? <LoadingState label="Loading employee detail..." /> : null}
      {!loading && error ? <ErrorState message={error} /> : null}
      {!loading && !error && data ? (
        <EmployeeDetailCard employee={data.employee} profileCompletenessScore={data.profileCompletenessScore} />
      ) : null}
    </div>
  );
};
