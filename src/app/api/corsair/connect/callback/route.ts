import { corsairClient } from "@/server/corsair-client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 },
    );
  }

  const callbackParams = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );

  const result = await corsairClient.connect.oauthCallback({
    code,
    state,
    callbackParams,
  });

  return NextResponse.json({
    success: true,
    plugin: result.plugin,
    tenantId: result.tenantId,
  });
}