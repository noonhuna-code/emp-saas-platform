"use client";

import { useEffect, useState } from "react";
import { fetchCurrentEmployeeId, peekCachedResult } from "@/lib/client/api";
import { EmployeeProfileScreen } from "@/components/profile/EmployeeProfileScreen";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import { EmployeeWorkspaceSetupState, isEmployeeWorkspaceSetupIssue } from "@/components/states/EmployeeWorkspaceSetupState";
import { PageContainer, PageHeader } from "@/components/dashboard-v2/PagePrimitives";

export const MyProfileScreen = ({ initialEmployeeId = null }: { initialEmployeeId?: string | null }) => {
  const cachedEmployee = peekCachedResult<{ employeeId: string }>("/api/employees/me");
  const resolvedInitialEmployeeId = cachedEmployee?.ok ? (cachedEmployee.data?.employeeId ?? null) : initialEmployeeId;
  const [employeeId, setEmployeeId] = useState<string | null>(resolvedInitialEmployeeId);
  const [loading, setLoading] = useState(!resolvedInitialEmployeeId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resolvedInitialEmployeeId) {
      setEmployeeId(resolvedInitialEmployeeId);
      setLoading(false);
      return;
    }

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
  }, [resolvedInitialEmployeeId]);

  if (loading) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Profile"
          title="My profile"
          description="Review and update your employee profile, documents, family details, and skill inventory."
        />
        <LoadingState label="Loading profile workspace" />
      </PageContainer>
    );
  }

  if (error || !employeeId) {
    return (
      <PageContainer>
        <PageHeader
          eyebrow="Profile"
          title="My profile"
          description="Review and update your employee profile, documents, family details, and skill inventory."
        />
        {isEmployeeWorkspaceSetupIssue(error) || !employeeId ? (
          <EmployeeWorkspaceSetupState
            title="Profile setup is not ready yet"
            description="This signed-in account does not currently resolve to a self-service employee profile inside the workspace."
          />
        ) : (
          <ErrorState message={error ?? "Employee profile unavailable"} />
        )}
      </PageContainer>
    );
  }

  return <EmployeeProfileScreen employeeId={employeeId} />;
};
