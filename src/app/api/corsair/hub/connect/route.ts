import { auth } from "@/auth";
import { corsair } from "@/server/corsair";
import { ensureCorsairTenant } from "@/server/tenant";
import { createHubConnectSession } from "corsair/hub";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tenant = await ensureCorsairTenant(session.user.id);

 const result = await createHubConnectSession(corsair, {
  tenantId: tenant.id,
  plugin: "gmail",
  oauthMode: "byo",
});

console.log("HUB CONNECT RESULT:", JSON.stringify(result, null, 2));

return NextResponse.json(result);
}