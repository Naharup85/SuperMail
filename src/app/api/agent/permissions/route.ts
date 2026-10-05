import { auth } from "@/auth";
import { getTenantId } from "@/server/tenant";
import {
  getUserPermissions,
  getAllActionPolicies,
} from "@/server/agent/policy";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 },
      );
    }

    const tenantId = getTenantId(session.user.id);
    const permissions = await getUserPermissions(session.user.id);
    const policies = getAllActionPolicies();

    return NextResponse.json({
      userId: session.user.id,
      tenantId,
      permissions,
      policies,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load agent permissions.";
    console.error("[PermissionsAPI] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
