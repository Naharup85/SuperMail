import { auth } from "@/auth";
import { getGmailMessage, trashGmailMessage } from "@/server/gmail";
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
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const message = await getGmailMessage(tenantId, id);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json(message);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch message";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const result = await trashGmailMessage(tenantId, id);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to trash message";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
