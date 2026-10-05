"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NormalizedEvent, parseCalendarEvent } from "@/types/mail";

export const CALENDAR_EVENTS_KEY = "calendar-events";
export const CALENDAR_EVENT_KEY = "calendar-event";

export interface UseCalendarEventsOptions {
  timeMin?: string;
  timeMax?: string;
  limit?: number;
  offset?: number;
}

export function useCalendarEvents(options: UseCalendarEventsOptions = {}) {
  const { timeMin, timeMax, limit = 50, offset = 0 } = options;

  return useQuery<NormalizedEvent[]>({
    queryKey: [CALENDAR_EVENTS_KEY, timeMin ?? "all", timeMax ?? "all", limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      if (timeMin) params.set("timeMin", timeMin);
      if (timeMax) params.set("timeMax", timeMax);

      const res = await fetch(`/api/calendar/events?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to fetch events (Status: ${res.status})`,
        );
      }
      const data = await res.json();
      const rawList = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.events)
            ? data.events
            : Array.isArray(data?.data)
              ? data.data
              : [];

      return rawList.map((e: unknown, idx: number) =>
        parseCalendarEvent(e, idx),
      );
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCalendarEvent(eventId: string | null | undefined) {
  return useQuery<NormalizedEvent>({
    queryKey: [CALENDAR_EVENT_KEY, eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("Event ID required");
      const res = await fetch(`/api/calendar/events/${eventId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData?.error || `Failed to fetch event (Status: ${res.status})`,
        );
      }
      const data = await res.json();
      return parseCalendarEvent(data);
    },
    enabled: Boolean(eventId),
    staleTime: 60 * 1000,
  });
}

export function useCalendarMutations() {
  const queryClient = useQueryClient();

  const createEvent = useMutation({
    mutationFn: async (payload: {
      summary: string;
      description?: string;
      location?: string;
      start: { dateTime?: string; date?: string; timeZone?: string };
      end: { dateTime?: string; date?: string; timeZone?: string };
      attendees?: Array<{ email: string; displayName?: string }>;
    }) => {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_KEY] });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: { dateTime?: string; date?: string; timeZone?: string };
      end?: { dateTime?: string; date?: string; timeZone?: string };
      attendees?: Array<{ email: string; displayName?: string }>;
    }) => {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to update event");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [CALENDAR_EVENT_KEY, variables.id],
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to delete event");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_KEY] });
      queryClient.invalidateQueries({
        queryKey: [CALENDAR_EVENT_KEY, variables.id],
      });
    },
  });

  return {
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
