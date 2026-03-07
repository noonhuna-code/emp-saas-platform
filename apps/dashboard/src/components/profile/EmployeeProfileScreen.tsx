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
  peekCachedResult
} from "@/lib/client/api";
import type { EmployeeProfile, EmployeeLookupResponse, EmployeeProfileResponse } from "@/lib/types/profile";
import { EmployeeProfileHeader } from "@/components/profile/EmployeeProfileHeader";
import { PersonalInfoSection } from "@/components/profile/PersonalInfoSection";
import { EmploymentInfoSection } from "@/components/profile/EmploymentInfoSection";
import { SensitiveDataSection } from "@/components/profile/SensitiveDataSection";
import { DocumentsSection } from "@/components/profile/DocumentsSection";
import { FamilySection } from "@/components/profile/FamilySection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { Tabs } from "@/components/shared/Tabs";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingState } from "@/components/states/LoadingState";

const TAB_ITEMS = [
  { id: "personal", label: "Personal" },
  { id: "employment", label: "Employment" },
  { id: "sensitive", label: "Sensitive" },
  { id: "documents", label: "Documents" },
  { id: "family", label: "Family" },
  { id: "skills", label: "Skills" }
];

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
    cachedSession?.ok ? Boolean(cachedSession.data?.permissions?.includes("manage_employees")) : false
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
      <div className="page-wrap">
        <LoadingState label="Loading employee profile..." />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-wrap">
        <ErrorState message={error ?? "Employee profile unavailable"} />
      </div>
    );
  }

  const displayName = profile.userProfile?.full_name ?? "Employee";
  const designation = (profile.employee.designation as string | undefined) ?? null;
  const department = profile.department?.name ?? null;
  const employmentStatus = (profile.employee.employment_status as string | undefined) ?? null;

  return (
    <div className="page-wrap stack">
      <div className="page-header">
        <div>
          <h1>Employee Profile</h1>
          <p className="muted">Manage profile data, documents, and employment status.</p>
        </div>
        <a className="secondary-btn" href={canManageEmployees ? "/app/employees" : "/app/dashboard"}>
          {canManageEmployees ? "Back to Directory" : "Back to Dashboard"}
        </a>
      </div>

      <EmployeeProfileHeader
        name={displayName}
        avatarUrl={profile.userProfile?.avatar_url ?? null}
        designation={designation}
        department={department}
        employmentStatus={employmentStatus}
        profileCompleteness={profile.profileCompletenessScore}
      />

      {error ? <ErrorState message={error} /> : null}

      <Tabs tabs={TAB_ITEMS} active={activeTab} onChange={setActiveTab} />

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
    </div>
  );
};
