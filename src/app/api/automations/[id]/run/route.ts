import { auth } from "@/auth";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";
import { getAutomationById } from "@/server/automations/repository";
import { executeAutomation } from "@/server/automations/runner";

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
  const automation = await getAutomationById(id, session.user.id, tenantId);

  if (!automation) {
    return NextResponse.json({ error: "Automation not found." }, { status: 404 });
  }

  try {
    const runResult = await executeAutomation(automation, { isManual: true });
    return NextResponse.json({ success: true, run: runResult });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Manual run failed";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
