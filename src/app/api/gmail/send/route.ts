import { auth } from "@/auth";
import { sendGmailMessage } from "@/server/gmail";
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
    const { to, subject, body: content, threadId, inReplyTo, cc } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "Recipient 'to' email is required" }, { status: 400 });
    }

    if (!subject && !content) {
      return NextResponse.json({ error: "Subject or body content is required" }, { status: 400 });
    }

    const sent = await sendGmailMessage(tenantId, {
      to,
      subject: subject || "(No Subject)",
      body: content || "",
      threadId,
      inReplyTo,
      cc,
    });

    return NextResponse.json({ success: true, message: sent });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
