import { auth } from "@/auth";
import { createGmailDraft } from "@/server/gmail";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const body = await request.json().catch(() => ({}));
    const { to, subject, body: content, threadId } = body;

    const draft = await createGmailDraft(tenantId, {
      to,
      subject,
      body: content,
      threadId,
    });

    return NextResponse.json({ success: true, draft });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create draft";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
