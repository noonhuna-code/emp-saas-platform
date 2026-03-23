import { NextResponse } from "next/server";
import {
  getOrganizationAdminData,
  saveOrganizationApprovalDelegation,
  saveOrganizationApprovalRoutingRule,
  saveOrganizationEmployeeAssignment,
  saveOrganizationJobRole,
  saveOrganizationOrgUnit,
  saveOrganizationOrgUnitType,
  saveOrganizationPosition,
  saveOrganizationPositionRelationship,
  saveOrganizationReportingLine,
  saveOrganizationRoleFamily,
} from "@emp/services/organization-admin.service";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";
import { handleRouteError, jsonError, mapServiceErrorStatus, sanitizeServiceError } from "@/lib/server/api-errors";
import { runGuardedMutation } from "@/lib/server/mutation-guard";

type MutationBody = {
  resource?: string;
  action?: "save" | "archive" | "restore" | "delete";
  payload?: Record<string, unknown>;
};

const endpoint = "/api/organization/admin";

export async function GET() {
  const route = await beginRoute();

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const result = await getOrganizationAdminData(route.ctx);
    if (!result.ok || !result.data) {
      return finalizeRoute(
        route,
        endpoint,
        jsonError(
          sanitizeServiceError(result.error, "Unable to load organization admin data"),
          mapServiceErrorStatus(result.error),
          route.requestId
        )
      );
    }

    return finalizeRoute(route, endpoint, NextResponse.json({ ok: true, data: result.data }, { status: 200 }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Unable to load organization admin data", route.requestId));
  }
}

export async function POST(request: Request) {
  const route = await beginRoute();

  try {
    if (!route.ctx) {
      return finalizeRoute(route, endpoint, jsonError("Authentication required", 401, route.requestId));
    }

    const body = (await request.json()) as MutationBody;
    const resource = typeof body.resource === "string" ? body.resource.trim() : "";
    const action = body.action ?? "save";
    const payload = body.payload ?? {};

    const guarded = await runGuardedMutation(route.ctx, request, endpoint, async () => {
      const result = await (async () => {
        switch (resource) {
          case "org_unit_type":
            return saveOrganizationOrgUnitType(route.ctx!, action, payload);
          case "org_unit":
            return saveOrganizationOrgUnit(route.ctx!, action, payload);
          case "role_family":
            return saveOrganizationRoleFamily(route.ctx!, action, payload);
          case "job_role":
            return saveOrganizationJobRole(route.ctx!, action, payload);
          case "position":
            return saveOrganizationPosition(route.ctx!, action, payload);
          case "position_relationship":
            return saveOrganizationPositionRelationship(route.ctx!, action, payload);
          case "employee_assignment":
            return saveOrganizationEmployeeAssignment(route.ctx!, action, payload);
          case "reporting_line":
            return saveOrganizationReportingLine(route.ctx!, action, payload);
          case "approval_delegation":
            return saveOrganizationApprovalDelegation(route.ctx!, action, payload);
          case "approval_routing_rule":
            return saveOrganizationApprovalRoutingRule(route.ctx!, action, payload);
          default:
            return { ok: false, error: "Unsupported organization admin resource" };
        }
      })();

      if (!result.ok) {
        return {
          status: mapServiceErrorStatus(result.error),
          body: { ok: false, error: result.error ?? "Organization admin mutation failed" },
        };
      }

      return {
        status: 200,
        body: { ok: true, data: result.data, requestId: route.requestId },
      };
    });

    if (!guarded.ok) {
      return finalizeRoute(route, endpoint, jsonError(guarded.error, guarded.status, route.requestId));
    }

    return finalizeRoute(route, endpoint, NextResponse.json(guarded.response.body, { status: guarded.response.status }));
  } catch (error) {
    return finalizeRoute(route, endpoint, handleRouteError(error, "Organization admin mutation failed", route.requestId));
  }
}
