import { auth } from "@/auth";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";
import {
  createAutomation,
  listAutomationsForUser,
} from "@/server/automations/repository";
import type { CreateAutomationInput } from "@/types/automations";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const automations = await listAutomationsForUser(session.user.id);
    return NextResponse.json({ automations });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch automations";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const body = (await request.json().catch(() => ({}))) as CreateAutomationInput;
    const { name, description, schedule, timezone, instruction, allowedTools } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Automation name is required." }, { status: 400 });
    }

    if (!instruction || typeof instruction !== "string") {
      return NextResponse.json({ error: "Task instruction is required." }, { status: 400 });
    }

    if (!timezone || typeof timezone !== "string") {
      return NextResponse.json({ error: "Timezone is required (e.g. 'Asia/Kolkata')." }, { status: 400 });
    }

    if (!schedule || !schedule.type) {
      return NextResponse.json({ error: "Schedule configuration is required." }, { status: 400 });
    }

    const created = await createAutomation({
      userId: session.user.id,
      tenantId,
      input: {
        name,
        description,
        schedule,
        timezone,
        instruction,
        allowedTools,
      },
    });

    return NextResponse.json({ success: true, automation: created }, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create automation";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
