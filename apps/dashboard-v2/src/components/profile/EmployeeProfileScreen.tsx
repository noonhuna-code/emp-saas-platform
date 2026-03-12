"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchEmployeeProfile,
  fetchEmployeeLookups,
  updatePersonalDetails,
  updateEmploymentInfo,
  updateSensitiveData,
  addEmployeeDocument,
  updateEmployeeDocument,
  deleteEmployeeDocument,
  addEmployeeFamilyMember,
  updateEmployeeFamilyMember,
  deleteEmployeeFamilyMember,
  addEmployeeSkill,
  updateEmployeeSkill,
  deleteEmployeeSkill,
  fetchSession,
  peekCachedResult,
} from "@/lib/client/api";
import type { EmployeeLookupResponse, EmployeeProfile, EmployeeProfileResponse } from "@/lib/types/profile";
import { PersonalInfoSection } from "@/components/profile/PersonalInfoSection";
import { EmploymentInfoSection } from "@/components/profile/EmploymentInfoSection";
import { SensitiveDataSection } from "@/components/profile/SensitiveDataSection";
import { DocumentsSection } from "@/components/profile/DocumentsSection";
import { FamilySection } from "@/components/profile/FamilySection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { Tabs } from "@/components/shared/Tabs";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";
import {
  DashboardRail,
  FeatureCallout,
  PageContainer,
  PageHeader,
  StatCard,
  StatGrid,
  SurfacePanel,
} from "@/components/dashboard-v2/PagePrimitives";
import { Badge } from "@/components/ui/badge";

const TAB_ITEMS = [
  { id: "personal", label: "Personal" },
  { id: "employment", label: "Employment" },
  { id: "sensitive", label: "Sensitive" },
  { id: "documents", label: "Documents" },
  { id: "family", label: "Family" },
  { id: "skills", label: "Skills" },
];

const getEmployeeField = (profile: EmployeeProfile, key: string): string | null => {
  const value = profile.employee[key];
  return typeof value === "string" && value.length > 0 ? value : null;
};

export const EmployeeProfileScreen = ({ employeeId }: { employeeId: string }) => {
  const cachedProfile = peekCachedResult<EmployeeProfileResponse>(`/api/employees/${employeeId}/profile`);
  const cachedLookups = peekCachedResult<EmployeeLookupResponse>("/api/employees/lookups");
  const cachedSession = peekCachedResult<{ permissions: string[] }>("/api/auth/session");

  const hasCachedProfile = Boolean(cachedProfile?.ok && cachedProfile.data?.profile);
  const [profile, setProfile] = useState<EmployeeProfile | null>(cachedProfile?.ok ? (cachedProfile.data?.profile ?? null) : null);
  const [lookups, setLookups] = useState<EmployeeLookupResponse | null>(cachedLookups?.ok ? (cachedLookups.data ?? null) : null);
  const [loading, setLoading] = useState(!hasCachedProfile);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [canManageEmployees, setCanManageEmployees] = useState(
    cachedSession?.ok ? Boolean(cachedSession.data?.permissions?.includes("manage_employees")) : false,
  );

  useEffect(() => {
    let active = true;
    if (!hasCachedProfile) {
      setLoading(true);
    }
    setError(null);

    void Promise.all([fetchEmployeeProfile(employeeId), fetchEmployeeLookups(), fetchSession()])
      .then(([profileResult, lookupResult, sessionResult]) => {
        if (!active) return;
        if (!profileResult.ok || !profileResult.data) {
          setError(profileResult.error ?? "Unable to load employee profile");
          return;
        }
        setProfile(profileResult.data.profile);
        if (lookupResult.ok && lookupResult.data) {
          setLookups(lookupResult.data);
        }
        if (sessionResult.ok && sessionResult.data) {
          setCanManageEmployees(sessionResult.data.permissions.includes("manage_employees"));
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load employee profile");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [employeeId, hasCachedProfile]);

  const updateProfileState = (next: EmployeeProfile | undefined) => {
    if (next) {
      setProfile(next);
    }
  };

  const applyUpdateResult = (result: { ok: boolean; data?: { profile: EmployeeProfile } | null; error?: string }, fallback: string) => {
    if (!result.ok || !result.data) {
      setError(result.error ?? fallback);
      return false;
    }
    setError(null);
    updateProfileState(result.data.profile);
    return true;
  };

  const refreshProfile = async () => {
    const profileResult = await fetchEmployeeProfile(employeeId);
    if (profileResult.ok && profileResult.data) {
      setProfile(profileResult.data.profile);
      setError(null);
    } else {
      setError(profileResult.error ?? "Unable to refresh profile");
    }
  };

  const canEditSelfSections = useMemo(() => true, []);
  const canEditEmployment = canManageEmployees;
  const canEditSensitive = profile?.canViewSensitive ?? false;

  if (loading) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Profile" title="Profile workspace" description="Manage your personal, employment, family, skill, and document records." />
        <LoadingState label="Loading profile workspace" />
      </PageContainer>
    );
  }

  if (error || !profile) {
    return (
      <PageContainer>
        <PageHeader eyebrow="Profile" title="Profile workspace" description="Manage your personal, employment, family, skill, and document records." />
        <ErrorState message={error ?? "Employee profile unavailable"} />
      </PageContainer>
    );
  }

  const displayName = profile.userProfile?.full_name ?? "Employee";
  const designation = getEmployeeField(profile, "designation");
  const department = profile.department?.name ?? "Unassigned";
  const team = profile.team?.name ?? "No team";
  const manager = profile.manager?.full_name ?? "No manager assigned";
  const employmentStatus = getEmployeeField(profile, "employment_status") ?? "active";
  const employeeCode = getEmployeeField(profile, "employee_code") ?? employeeId;
  const profileCompleteness = profile.profileCompletenessScore ?? 0;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Profile"
        title={displayName}
        description="Manage your personal record, employment details, supporting documents, family data, and skill inventory."
        actions={
          <>
            <Badge className="rounded-full border-blue-200 bg-blue-50 text-blue-700">
              {employeeCode}
            </Badge>
            <Badge className="rounded-full border-slate-200 bg-white text-slate-700">
              {employmentStatus}
            </Badge>
            <a
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              href={canManageEmployees ? "/app/employees" : "/app/dashboard"}
            >
              {canManageEmployees ? "Back to directory" : "Back to dashboard"}
            </a>
          </>
        }
      />

      <FeatureCallout
        badge="Employee profile"
        title="Keep core identity, compliance, and skills aligned"
        description="The profile workspace brings together the current employee record, document readiness, household information, and talent inventory without changing the existing profile contracts."
      />

      <DashboardRail>
        <SurfacePanel title="Profile overview" description="Current reporting structure and organizational placement.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Designation</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{designation ?? "Employee"}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Department</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{department}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Team</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{team}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reports to</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{manager}</p>
            </div>
          </div>
        </SurfacePanel>

        <StatGrid className="xl:grid-cols-2">
          <StatCard label="Profile completeness" value={`${profileCompleteness}%`} hint="Signal used by HR profile quality checks" />
          <StatCard label="Documents" value={profile.documents.length} hint="Uploaded employee records" />
          <StatCard label="Family members" value={profile.familyMembers.length} hint="Dependents and emergency records" />
          <StatCard label="Skills" value={profile.skills.length} hint="Tracked capabilities" />
        </StatGrid>
      </DashboardRail>

      {error ? <ErrorState message={error} /> : null}

      <SurfacePanel title="Profile sections" description="Switch between employee data sections without leaving the profile workspace.">
        <Tabs tabs={TAB_ITEMS} active={activeTab} onChange={setActiveTab} />
      </SurfacePanel>

      {activeTab === "personal" ? (
        <PersonalInfoSection
          details={profile.personalDetails}
          canEdit={canEditSelfSections}
          onSave={async (payload) => {
            const result = await updatePersonalDetails(employeeId, payload);
            applyUpdateResult(result, "Unable to update personal details");
          }}
        />
      ) : null}

      {activeTab === "employment" ? (
        <EmploymentInfoSection
          employee={profile.employee}
          lookups={lookups}
          canEdit={canEditEmployment}
          onSave={async (payload) => {
            const result = await updateEmploymentInfo(employeeId, payload);
            applyUpdateResult(result, "Unable to update employment info");
          }}
        />
      ) : null}

      {activeTab === "sensitive" ? (
        <SensitiveDataSection
          sensitive={profile.sensitiveData}
          personal={profile.personalDetails}
          canEdit={canEditSensitive}
          onSave={async (payload) => {
            const result = await updateSensitiveData(employeeId, payload);
            applyUpdateResult(result, "Unable to update sensitive data");
          }}
        />
      ) : null}

      {activeTab === "documents" ? (
        <DocumentsSection
          employeeId={employeeId}
          documents={profile.documents}
          canEdit={canEditSelfSections}
          onAdd={async (payload) => {
            const result = await addEmployeeDocument(employeeId, payload);
            applyUpdateResult(result, "Unable to add document");
          }}
          onUpdate={async (docId, payload) => {
            const result = await updateEmployeeDocument(employeeId, docId, payload);
            applyUpdateResult(result, "Unable to update document");
          }}
          onDelete={async (docId) => {
            const result = await deleteEmployeeDocument(employeeId, docId);
            applyUpdateResult(result, "Unable to remove document");
          }}
          onRefresh={refreshProfile}
        />
      ) : null}

      {activeTab === "family" ? (
        <FamilySection
          family={profile.familyMembers}
          canEdit={canEditSelfSections}
          onAdd={async (payload) => {
            const result = await addEmployeeFamilyMember(employeeId, payload);
            applyUpdateResult(result, "Unable to add family member");
          }}
          onUpdate={async (memberId, payload) => {
            const result = await updateEmployeeFamilyMember(employeeId, memberId, payload);
            applyUpdateResult(result, "Unable to update family member");
          }}
          onDelete={async (memberId) => {
            const result = await deleteEmployeeFamilyMember(employeeId, memberId);
            applyUpdateResult(result, "Unable to remove family member");
          }}
        />
      ) : null}

      {activeTab === "skills" ? (
        <SkillsSection
          skills={profile.skills}
          canEdit={canEditSelfSections}
          onAdd={async (payload) => {
            const result = await addEmployeeSkill(employeeId, payload);
            applyUpdateResult(result, "Unable to add skill");
          }}
          onUpdate={async (skillId, payload) => {
            const result = await updateEmployeeSkill(employeeId, skillId, payload);
            applyUpdateResult(result, "Unable to update skill");
          }}
          onDelete={async (skillId) => {
            const result = await deleteEmployeeSkill(employeeId, skillId);
            applyUpdateResult(result, "Unable to remove skill");
          }}
        />
      ) : null}
    </PageContainer>
  );
};

