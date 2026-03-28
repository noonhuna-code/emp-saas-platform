export type EmployeePersonalDetails = {
  id: string;
  employee_id: string;
  company_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  nationality?: string | null;
  phone_number?: string | null;
  alternate_phone?: string | null;
  official_email?: string | null;
  personal_email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  national_id_masked?: string | null;
  passport_number_masked?: string | null;
  tax_id_masked?: string | null;
  bank_account_masked?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeSensitiveData = {
  id: string;
  employee_id: string;
  company_id: string;
  national_id?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  visa_status?: string | null;
  tax_id?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_iban?: string | null;
  bank_branch?: string | null;
  bank_swift?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeDocument = {
  id: string;
  employee_id: string;
  company_id: string;
  document_type: string;
  document_name?: string | null;
  document_number?: string | null;
  file_url?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  storage_mime_type?: string | null;
  storage_size?: number | null;
  storage_checksum?: string | null;
  current_version?: number | null;
  last_uploaded_at?: string | null;
  last_uploaded_by?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeDocumentVersion = {
  id: string;
  company_id: string;
  document_id: string;
  employee_id: string;
  version_number: number;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  storage_mime_type?: string | null;
  storage_size?: number | null;
  storage_checksum?: string | null;
  uploaded_at?: string | null;
  uploaded_by?: string | null;
};

export type EmployeeFamilyMember = {
  id: string;
  employee_id: string;
  company_id: string;
  full_name: string;
  relationship: string;
  date_of_birth?: string | null;
  phone_number?: string | null;
  is_dependent?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeSkill = {
  id: string;
  employee_id: string;
  company_id: string;
  skill_name: string;
  proficiency?: string | null;
  years_experience?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeEducation = {
  id: string;
  employee_id: string;
  company_id: string;
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  grade?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EmployeeProfile = {
  employee: Record<string, unknown>;
  userProfile: { id: string; full_name: string; avatar_url?: string | null } | null;
  department: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  manager: { id: string; full_name: string } | null;
  personalDetails: EmployeePersonalDetails | null;
  sensitiveData: EmployeeSensitiveData | null;
  documents: EmployeeDocument[];
  familyMembers: EmployeeFamilyMember[];
  skills: EmployeeSkill[];
  education: EmployeeEducation[];
  profileCompletenessScore: number | null;
  canViewSensitive: boolean;
};

export type EmployeeProfileResponse = {
  profile: EmployeeProfile;
};

export type EmployeeDocumentVersionsResponse = {
  versions: EmployeeDocumentVersion[];
};

export type EmployeeDocumentDownloadResponse = {
  url: string;
  expiresAt: string;
};

export type EmployeeDocumentUploadResponse = {
  versionId: string;
  versionNumber: number;
};

export type EmployeeLookupResponse = {
  departments: Array<{ id: string; name: string }>;
  teams: Array<{ id: string; name: string; department_id?: string | null }>;
  managers: Array<{ id: string; full_name: string }>;
};
