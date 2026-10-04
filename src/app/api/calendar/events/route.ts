import { auth } from "@/auth";
import { createCalendarEvent, listCalendarEvents } from "@/server/googlecalendar";
import { getTenantId } from "@/server/tenant";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);

  const limit = Number(searchParams.get("limit") ?? "50");
  const offset = Number(searchParams.get("offset") ?? "0");
  const timeMin = searchParams.get("timeMin") ?? undefined;
  const timeMax = searchParams.get("timeMax") ?? undefined;

  const tenantId = getTenantId(session.user.id);

  const events = await listCalendarEvents(tenantId, {
    limit,
    offset,
    timeMin,
    timeMax,
  });

  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const tenantId = getTenantId(session.user.id);

  try {
    const body = await request.json().catch(() => ({}));
    const { summary, description, location, start, end, attendees } = body;

    if (!summary || typeof summary !== "string") {
      return NextResponse.json(
        { error: "Event title / summary is required" },
        { status: 400 },
      );
    }

    if (!start?.dateTime && !start?.date) {
      return NextResponse.json(
        { error: "Event start date or time is required" },
        { status: 400 },
      );
    }

    if (!end?.dateTime && !end?.date) {
      return NextResponse.json(
        { error: "Event end date or time is required" },
        { status: 400 },
      );
    }

    const created = await createCalendarEvent(tenantId, {
      summary,
      description,
      location,
      start,
      end,
      attendees,
    });

    return NextResponse.json({ success: true, event: created });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create calendar event";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}