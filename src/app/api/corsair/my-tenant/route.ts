import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { ensureCorsairTenant } from "@/server/tenant";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tenant = await ensureCorsairTenant(session.user.id);

  return NextResponse.json(tenant);
}