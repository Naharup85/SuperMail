import { corsair } from "@/server/corsair";
import { processOAuthCallback } from "corsair/oauth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 },
    );
  }

  const redirectUri =
    `${process.env.NEXT_PUBLIC_APP_URL}/api/corsair/connect/gmail/callback`;

  const result = await processOAuthCallback(corsair, {
    code,
    state,
    redirectUri,
  });

  return NextResponse.json({
    success: true,
    plugin: result.plugin,
    tenantId: result.tenantId,
  });
}