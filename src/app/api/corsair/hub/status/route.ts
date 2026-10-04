import { corsairClient } from "@/server/corsair-client";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await corsairClient.connectionStatus.get({
    tenantId: "user_101599368231695294122",
  });

  return NextResponse.json(result);
}