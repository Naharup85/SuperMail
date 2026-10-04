import { auth } from "@/auth";
import { getGmailThread } from "@/server/gmail";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Thread ID is required" }, { status: 400 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const thread = await getGmailThread(tenantId, id);
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }
    return NextResponse.json(thread);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch thread";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
