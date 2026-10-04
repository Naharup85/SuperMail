import { corsairClient } from "@/server/corsair-client";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await corsairClient.tenants.get("dev");

  return NextResponse.json(result);
}