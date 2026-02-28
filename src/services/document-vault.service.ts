import type { ServiceContext, ServiceResult } from "../lib/types";
import { assertEmployeeScope } from "../lib/auth-wrapper";
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

    if (!file || !file.name) {
      return { ok: false, error: "File is required" };
    }

    const versionId = crypto.randomUUID();
    const bucket = "employee-documents";
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const storagePath = `${ctx.companyId}/${employeeId}/${documentId}/${versionId}/${sanitizedName}`;

    const { error: uploadError } = await ctx.supabase.storage
      .from(bucket)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false
      });

    if (uploadError) {
      return { ok: false, error: "Unable to upload document" };
    }

    const rpcResult = await ctx.supabase.rpc("register_employee_document_version", {
      p_document_id: documentId,
      p_storage_bucket: bucket,
      p_storage_path: storagePath,
      p_file_name: sanitizedName,
      p_storage_size: file.size,
      p_storage_mime_type: file.type || null,
      p_storage_checksum: null,
      p_uploaded_by: ctx.userProfileId
    });

    if (rpcResult.error || !rpcResult.data) {
      return { ok: false, error: "Unable to register document version" };
    }

    const payload = rpcResult.data as { version_id?: string; version_number?: number };

    return {
      ok: true,
      data: {
        versionId: payload.version_id ?? versionId,
        versionNumber: payload.version_number ?? 1
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

    const { data: signed, error: signedError } = await ctx.supabase.storage
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
