import { auth } from "@/auth";
import {
  deleteCalendarEvent,
  getCalendarEvent,
  updateCalendarEvent,
} from "@/server/googlecalendar";
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
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const event = await getCalendarEvent(tenantId, id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json(event);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch event";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const body = await request.json().catch(() => ({}));
    const { summary, description, location, start, end, attendees } = body;

    const updated = await updateCalendarEvent(tenantId, id, {
      summary,
      description,
      location,
      start,
      end,
      attendees,
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update event";
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
    return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
  }

  const tenantId = getTenantId(session.user.id);

  try {
    await deleteCalendarEvent(tenantId, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete event";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
