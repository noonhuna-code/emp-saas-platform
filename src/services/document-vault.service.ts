import type { ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope } from "../lib/auth-wrapper";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requirePlanFeature } from "../lib/entitlements";

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

const resolveCurrentEmployeeId = async (ctx: ServiceContext): Promise<string | null> => {
  try {
    const { data, error } = await ctx.supabase.rpc("current_user_employee_id");
    if (!error && data) {
      return data as string;
    }
  } catch {
    // fall through
  }

  const { data: employee } = await ctx.supabase
    .from("employees")
    .select("id")
    .eq("company_id", ctx.companyId)
    .eq("user_profile_id", ctx.userProfileId)
    .is("is_deleted", false)
    .maybeSingle();

  return employee?.id ?? null;
};

const requireSelfOrManageEmployees = async (ctx: ServiceContext, employeeId: string): Promise<void> => {
  if (ctx.permissions.includes("manage_employees")) {
    return;
  }
  const currentEmployeeId = await resolveCurrentEmployeeId(ctx);
  if (!currentEmployeeId || currentEmployeeId !== employeeId) {
    throw new Error("Permission denied");
  }
};

const requireDocumentVaultEntitlement = async (ctx: ServiceContext): Promise<void> => {
  await requirePlanFeature(ctx, "feature.core_employee_management");
};

const getAdminEnv = (key: string): string => process.env[key] ?? "";

const createSupabaseAdminClient = (): SupabaseClient => {
  const url = getAdminEnv("SUPABASE_URL") || getAdminEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getAdminEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export const listEmployeeDocumentVersions = async (
  ctx: ServiceContext,
  employeeId: string,
  documentId: string
): Promise<ServiceResult<EmployeeDocumentVersion[]>> => {
  try {
    await requireDocumentVaultEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);

    const { data, error } = await ctx.supabase
      .from("employee_document_versions")
      .select("*")
      .eq("document_id", documentId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .order("version_number", { ascending: false });

    if (error) {
      return { ok: false, error: "Unable to load document versions" };
    }

    return { ok: true, data: (data ?? []) as EmployeeDocumentVersion[] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to load document versions" };
  }
};

export const uploadEmployeeDocumentVersion = async (
  ctx: ServiceContext,
  employeeId: string,
  documentId: string,
  file: File
): Promise<ServiceResult<{ versionId: string; versionNumber: number }>> => {
  try {
    await requireDocumentVaultEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);
    const admin = createSupabaseAdminClient();

    if (!file || !file.name) {
      return { ok: false, error: "File is required" };
    }

    const versionId = crypto.randomUUID();
    const bucket = "employee-documents";
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const storagePath = `${ctx.companyId}/${employeeId}/${documentId}/${versionId}/${sanitizedName}`;

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      return { ok: false, error: "Unable to upload document" };
    }

    const { data: latestVersion, error: latestVersionError } = await admin
      .from("employee_document_versions")
      .select("version_number")
      .eq("document_id", documentId)
      .eq("employee_id", employeeId)
      .eq("company_id", ctx.companyId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestVersionError) {
      await admin.storage.from(bucket).remove([storagePath]);
      return { ok: false, error: "Unable to register document version" };
    }

    const versionNumber = ((latestVersion?.version_number as number | null) ?? 0) + 1;

    const { error: versionInsertError } = await admin
      .from("employee_document_versions")
      .insert({
        id: versionId,
        company_id: ctx.companyId,
        document_id: documentId,
        employee_id: employeeId,
        version_number: versionNumber,
        file_name: sanitizedName,
        storage_bucket: bucket,
        storage_path: storagePath,
        storage_mime_type: file.type || null,
        storage_size: file.size,
        storage_checksum: null,
        uploaded_by: ctx.userProfileId
      });

    if (versionInsertError) {
      await admin.storage.from(bucket).remove([storagePath]);
      return { ok: false, error: "Unable to register document version" };
    }

    const { error: documentUpdateError } = await admin
      .from("employee_documents")
      .update({
        storage_bucket: bucket,
        storage_path: storagePath,
        storage_mime_type: file.type || null,
        storage_size: file.size,
        storage_checksum: null,
        current_version: versionNumber,
        last_uploaded_at: new Date().toISOString(),
        last_uploaded_by: ctx.userProfileId,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userProfileId
      })
      .eq("id", documentId)
      .eq("company_id", ctx.companyId)
      .eq("employee_id", employeeId)
      .is("is_deleted", false);

    if (documentUpdateError) {
      await admin.storage.from(bucket).remove([storagePath]);
      return { ok: false, error: "Unable to register document version" };
    }

    await admin
      .from("employee_document_access_log")
      .insert({
        company_id: ctx.companyId,
        document_id: documentId,
        employee_id: employeeId,
        action: "upload",
        actor_profile_id: ctx.userProfileId
      });

    return {
      ok: true,
      data: {
        versionId,
        versionNumber
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to upload document" };
  }
};

export const createEmployeeDocumentDownloadUrl = async (
  ctx: ServiceContext,
  employeeId: string,
  documentId: string,
  versionId?: string | null
): Promise<ServiceResult<{ url: string; expiresAt: string }>> => {
  try {
    await requireDocumentVaultEntitlement(ctx);
    await requireSelfOrManageEmployees(ctx, employeeId);
    assertEmployeeScope(employeeId, ctx);
    const admin = createSupabaseAdminClient();

    let bucket: string | null = null;
    let path: string | null = null;
    let resolvedEmployeeId: string | null = null;

    if (versionId) {
      const { data, error } = await ctx.supabase
        .from("employee_document_versions")
        .select("storage_bucket, storage_path, employee_id")
        .eq("id", versionId)
        .eq("document_id", documentId)
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.companyId)
        .maybeSingle();

      if (error || !data) {
        return { ok: false, error: "Document version not found" };
      }

      bucket = data.storage_bucket;
      path = data.storage_path;
      resolvedEmployeeId = data.employee_id;
    } else {
      const { data, error } = await ctx.supabase
        .from("employee_documents")
        .select("storage_bucket, storage_path, employee_id")
        .eq("id", documentId)
        .eq("company_id", ctx.companyId)
        .eq("employee_id", employeeId)
        .is("is_deleted", false)
        .maybeSingle();

      if (error || !data) {
        return { ok: false, error: "Document not found" };
      }

      bucket = data.storage_bucket;
      path = data.storage_path;
      resolvedEmployeeId = data.employee_id;
    }

    if (!bucket || !path || !resolvedEmployeeId) {
      return { ok: false, error: "Document file unavailable" };
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 15);

    if (signedError || !signed) {
      return { ok: false, error: "Unable to generate download link" };
    }

    await ctx.supabase
      .from("employee_document_access_log")
      .insert({
        company_id: ctx.companyId,
        document_id: documentId,
        employee_id: resolvedEmployeeId,
        action: "download",
        actor_profile_id: ctx.userProfileId
      });

    return {
      ok: true,
      data: {
        url: signed.signedUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      }
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unable to generate download link" };
  }
};
