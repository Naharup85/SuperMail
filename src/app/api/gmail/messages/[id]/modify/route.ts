import { auth } from "@/auth";
import { modifyGmailMessage } from "@/server/gmail";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
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
    const body = await request.json().catch(() => ({}));
    const { addLabelIds = [], removeLabelIds = [] } = body;

    const updated = await modifyGmailMessage(tenantId, id, {
      addLabelIds,
      removeLabelIds,
    });

    return NextResponse.json({ success: true, message: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to modify message labels";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
