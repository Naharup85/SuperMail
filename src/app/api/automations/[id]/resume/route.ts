import { auth } from "@/auth";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";
import { resumeAutomation } from "@/server/automations/repository";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = getTenantId(session.user.id);
  const resumed = await resumeAutomation(id, session.user.id, tenantId);

  if (!resumed) {
    return NextResponse.json({ error: "Automation not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, automation: resumed });
}
