import { auth } from "@/auth";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";
import {
  getAutomationById,
  updateAutomation,
  deleteAutomation,
  listRunsForAutomation,
} from "@/server/automations/repository";
import type { UpdateAutomationInput } from "@/types/automations";

export async function GET(
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

  const recentRuns = await listRunsForAutomation(id, session.user.id, 10);

  return NextResponse.json({ automation, recentRuns });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = getTenantId(session.user.id);

  try {
    const body = (await request.json().catch(() => ({}))) as UpdateAutomationInput;
    const updated = await updateAutomation(id, session.user.id, tenantId, body);

    if (!updated) {
      return NextResponse.json({ error: "Automation not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, automation: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update automation";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const tenantId = getTenantId(session.user.id);
  const deleted = await deleteAutomation(id, session.user.id, tenantId);

  if (!deleted) {
    return NextResponse.json({ error: "Automation not found or already deleted." }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: "Automation deleted." });
}
