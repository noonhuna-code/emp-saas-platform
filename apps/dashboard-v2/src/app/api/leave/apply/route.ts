import { NextResponse } from "next/server";
import { applyLeave, type LeavePayload, uploadLeaveRequestAttachment } from "@emp/services/leave.service";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { buildLeaveRouteContext, resolveTargetEmployeeId } from "../_utils";

export async function POST(request: Request) {
  const route = await beginRoute();
  const endpoint = "/api/leave/apply";

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const { ctx } = await buildLeaveRouteContext(route.ctx);
    const contentType = request.headers.get("content-type") ?? "";
    let employeeIdInput: string | null = null;
    let attachment: File | null = null;
    let payload: LeavePayload;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      employeeIdInput = String(formData.get("employeeId") ?? "").trim() || null;
      const maybeFile = formData.get("attachment");
      attachment = maybeFile instanceof File && maybeFile.size > 0 ? maybeFile : null;
      payload = {
        leave_type_id: String(formData.get("leave_type_id") ?? ""),
        start_date: String(formData.get("start_date") ?? ""),
        end_date: String(formData.get("end_date") ?? ""),
        reason: String(formData.get("reason") ?? "").trim() || undefined,
        is_half_day: String(formData.get("is_half_day") ?? "").toLowerCase() === "true",
        half_day_type: (String(formData.get("half_day_type") ?? "").trim() || undefined) as
          | "first_half"
          | "second_half"
          | undefined,
      };
    } else {
      const jsonPayload = (await request.json()) as { employeeId?: string } & LeavePayload;
      employeeIdInput = jsonPayload.employeeId ?? null;
      payload = jsonPayload;
    }

    const employeeId = await resolveTargetEmployeeId(ctx, employeeIdInput);
    if (!employeeId) {
      return finalizeRoute(route, endpoint, jsonError("Employee record not found", 404, route.requestId));
    }

    const guarded = await runGuardedMutation(ctx, request, endpoint, async () => {
      const result = await applyLeave(ctx, employeeId, payload);
      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Leave request failed") }
        };
      }
      if (attachment && result.data?.requestId) {
        const attachmentResult = await uploadLeaveRequestAttachment(ctx, employeeId, result.data.requestId, attachment);
        if (!attachmentResult.ok) {
          return {
            status: mapServiceErrorStatus(attachmentResult.error),
            body: { ok: false, error: sanitizeServiceError(attachmentResult.error, "Leave attachment failed") }
          };
        }
      }
      return { status: 200, body: { ok: true, data: result.data } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json(guarded.response.body, { status: guarded.response.status })
    );
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to submit leave request", route.requestId));
  }
}
