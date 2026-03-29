import { NextResponse } from "next/server";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";
import { deleteWorkspaceNote, updateWorkspaceNote } from "@emp/services/employee-workspace.service";

type UpdateNoteBody = {
  title?: string;
  body?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  isPinned?: boolean;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/notes/[noteId]";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const body = (await request.json()) as UpdateNoteBody;
    const { noteId } = await params;
    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await updateWorkspaceNote(route.ctx!, noteId, {
        title: String(body.title ?? ""),
        body: String(body.body ?? ""),
        fileUrl: body.fileUrl ?? null,
        fileName: body.fileName ?? null,
        isPinned: Boolean(body.isPinned),
      });

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to update note") },
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to update note", route.requestId));
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const route = await beginRoute();
  const endpoint = "/api/workspace/notes/[noteId]";

  try {
    if (!route.ctx) return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));

    const { noteId } = await params;
    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await deleteWorkspaceNote(route.ctx!, noteId);

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: sanitizeServiceError(result.error, "Unable to delete note") },
        };
      }

      return { status: 200, body: { ok: true, data: result.data, requestId: route.requestId } };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to delete note", route.requestId));
  }
}
