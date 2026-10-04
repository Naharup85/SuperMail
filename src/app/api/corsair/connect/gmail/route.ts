import { auth } from "@/auth";
import { corsair } from "@/server/corsair";
import { ensureCorsairTenant } from "@/server/tenant";
import { generateOAuthUrl } from "corsair/oauth";
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

  const redirectUri =
    `${process.env.NEXT_PUBLIC_APP_URL}/api/corsair/connect/gmail/callback`;

  const result = await generateOAuthUrl(
    corsair,
    "gmail",
    {
      tenantId: tenant.id,
      redirectUri,
    },
  );

  return NextResponse.json(result);
}