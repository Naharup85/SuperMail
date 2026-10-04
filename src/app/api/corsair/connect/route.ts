import { corsairClient } from "@/server/corsair-client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");

  if (!state) {
    return NextResponse.json(
      { error: "Missing state" },
      { status: 400 },
    );
  }

  const result = await corsairClient.connect.resolve(state);

  return NextResponse.redirect(result.oauthUrl);
}