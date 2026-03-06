"use client";

import { useEffect, useState } from "react";
import { fetchCurrentEmployeeId, peekCachedResult } from "@/lib/client/api";
import { EmployeeProfileScreen } from "@/components/profile/EmployeeProfileScreen";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";

export const MyProfileScreen = () => {
  const cachedEmployee = peekCachedResult<{ employeeId: string }>("/api/employees/me");
  const [employeeId, setEmployeeId] = useState<string | null>(cachedEmployee?.ok ? (cachedEmployee.data?.employeeId ?? null) : null);
  const [loading, setLoading] = useState(!(cachedEmployee?.ok && cachedEmployee.data?.employeeId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);

    void fetchCurrentEmployeeId()
      .then((result) => {
        if (!active) return;
        if (!result.ok || !result.data) {
          setError(result.error ?? "Unable to resolve employee profile");
          return;
        }
        setEmployeeId(result.data.employeeId);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to resolve employee profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="page-wrap">
        <LoadingState label="Loading profile..." />
      </div>
    );
  }

  if (error || !employeeId) {
    return (
      <div className="page-wrap">
        <ErrorState message={error ?? "Employee profile unavailable"} />
      </div>
    );
  }

  return <EmployeeProfileScreen employeeId={employeeId} />;
};

