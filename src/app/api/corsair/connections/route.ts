import { auth } from "@/auth";
import { corsairClient } from "@/server/corsair-client";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const status = await corsairClient.connectionStatus.get({ tenantId });

    return NextResponse.json({
      gmail: {
        connected: status?.gmail === "connected",
      },
      googlecalendar: {
        connected: status?.googlecalendar === "connected",
      },
    });
  } catch {
    // If tenant is not created or status check fails, return not connected safely
    return NextResponse.json({
      gmail: {
        connected: false,
      },
      googlecalendar: {
        connected: false,
      },
    });
  }
}
