import { auth } from "@/auth";
import { listGmailMessages } from "@/server/gmail";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);

  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");

  const tenantId = getTenantId(session.user.id);

  const messages = await listGmailMessages(tenantId, {
    limit,
    offset,
  });
  return NextResponse.json(messages);
}
