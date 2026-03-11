import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server/auth";
import { beginRoute, finalizeRoute } from "@/lib/server/route-helpers";

export async function GET() {
  const route = await beginRoute();
  const endpoint = "/api/auth/session";

  try {
    const session = await getServerSession();
    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json({
        ok: true,
        data: {
          userId: session.userId,
          companyId: session.companyId,
          employeeId: session.employeeId,
          employeeCode: session.employeeCode,
          role: session.role,
          permissions: session.permissions,
          email: session.email,
          fullName: session.fullName,
          avatarUrl: session.avatarUrl,
          lastLoginAt: session.lastLoginAt,
          shiftStartTime: session.shiftStartTime,
          shiftEndTime: session.shiftEndTime,
          shiftHours: session.shiftHours
        }
      })
    );
  } catch (error) {
    return finalizeRoute(
      route,
      endpoint,
      NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Session lookup failed" },
        { status: 500 }
      )
    );
  }
}


