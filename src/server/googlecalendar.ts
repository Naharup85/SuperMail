import { corsair } from "./corsair";

export interface ListCalendarEventsOptions {
  limit?: number;
  offset?: number;
  timeMin?: string;
  timeMax?: string;
}

export interface CreateCalendarEventOptions {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  calendarId?: string;
}

export interface UpdateCalendarEventOptions {
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  calendarId?: string;
}

export async function listCalendarEvents(
  tenantId: string,
  options: ListCalendarEventsOptions = {},
) {
  const { limit = 50, offset = 0 } = options;

  return corsair.withTenant(tenantId).googlecalendar.db.events.search({
    limit,
    offset,
  });
}

export async function getCalendarEvent(
  tenantId: string,
  eventId: string,
  calendarId: string = "primary",
) {
  try {
    return await corsair.withTenant(tenantId).googlecalendar.api.events.get({
      id: eventId,
      calendarId,
    });
  } catch {
    return await corsair
      .withTenant(tenantId)
      .googlecalendar.db.events.findByEntityId(eventId);
  }
}

export async function createCalendarEvent(
  tenantId: string,
  options: CreateCalendarEventOptions,
) {
  const { calendarId = "primary", ...eventData } = options;

  return await corsair.withTenant(tenantId).googlecalendar.api.events.create({
    calendarId,
    event: {
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: eventData.start,
      end: eventData.end,
      attendees: eventData.attendees,
    },
  });
}

export async function updateCalendarEvent(
  tenantId: string,
  eventId: string,
  options: UpdateCalendarEventOptions,
) {
  const { calendarId = "primary", ...eventData } = options;

  return await corsair.withTenant(tenantId).googlecalendar.api.events.update({
    id: eventId,
    calendarId,
    event: {
      summary: eventData.summary,
      description: eventData.description,
      location: eventData.location,
      start: eventData.start,
      end: eventData.end,
      attendees: eventData.attendees,
    },
  });
}

export async function deleteCalendarEvent(
  tenantId: string,
  eventId: string,
  calendarId: string = "primary",
) {
  return await corsair.withTenant(tenantId).googlecalendar.api.events.delete({
    id: eventId,
    calendarId,
  });
}