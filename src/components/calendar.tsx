"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NormalizedEvent } from "@/types/mail";
import { EventModal } from "@/components/event-modal";

interface CalendarViewProps {
  events: NormalizedEvent[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onConnectCalendar: () => void;
  onEventCreated?: () => void;
  onEventUpdated?: () => void;
  onEventDeleted?: () => void;
}

type CalendarViewMode = "agenda" | "day" | "week";

export function CalendarView({
  events,
  isLoading,
  error,
  onRefresh,
  onConnectCalendar,
  onEventCreated,
  onEventUpdated,
  onEventDeleted,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>("agenda");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<NormalizedEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<NormalizedEvent | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Navigation handlers
  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const handlePrev = () => {
    const next = new Date(selectedDate);
    if (viewMode === "day") {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setSelectedDate(next);
  };

  const handleNext = () => {
    const next = new Date(selectedDate);
    if (viewMode === "day") {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setSelectedDate(next);
  };

  const getHeaderTitle = () => {
    if (viewMode === "day") {
      return selectedDate.toLocaleDateString([], {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    }
    if (viewMode === "week") {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startMonth = startOfWeek.toLocaleDateString([], { month: "short" });
      const endMonth = endOfWeek.toLocaleDateString([], { month: "short" });
      const year = endOfWeek.getFullYear();

      if (startMonth === endMonth) {
        return `${startMonth} ${startOfWeek.getDate()} – ${endOfWeek.getDate()}, ${year}`;
      }
      return `${startMonth} ${startOfWeek.getDate()} – ${endMonth} ${endOfWeek.getDate()}, ${year}`;
    }
    return selectedDate.toLocaleDateString([], {
      month: "long",
      year: "numeric",
    });
  };

  // Filter events based on viewMode and selectedDate
  const filteredEvents = events.filter((evt) => {
    if (!evt.rawStart) return true;

    if (viewMode === "day") {
      return evt.rawStart.toDateString() === selectedDate.toDateString();
    }

    if (viewMode === "week") {
      const startOfWeek = new Date(selectedDate);
      startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      return evt.rawStart >= startOfWeek && evt.rawStart < endOfWeek;
    }

    return true; // Agenda shows all upcoming
  });

  // Sort events chronologically
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (!a.rawStart) return 1;
    if (!b.rawStart) return -1;
    return a.rawStart.getTime() - b.rawStart.getTime();
  });

  // Delete event handler
  const handleDeleteEvent = async (id: string) => {
    setIsDeletingId(id);
    try {
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedEvent?.id === id) {
          setSelectedEvent(null);
        }
        if (onEventDeleted) onEventDeleted();
        onRefresh();
      }
    } catch {
      // Revert
    } finally {
      setIsDeletingId(null);
    }
  };

  // Open edit modal
  const handleEditEvent = (evt: NormalizedEvent) => {
    setEventToEdit(evt);
    setIsEventModalOpen(true);
  };

  // Open create modal
  const handleCreateEvent = () => {
    setEventToEdit(null);
    setIsEventModalOpen(true);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-zinc-950 p-6">
        <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="h-6 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-8 w-24 animate-pulse rounded bg-zinc-800" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="flex items-start gap-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 animate-pulse"
            >
              <div className="h-10 w-12 rounded-lg bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-zinc-800" />
                <div className="h-3 w-64 rounded bg-zinc-800/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-12 text-center bg-zinc-950">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 mb-4">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-zinc-100 mb-1">
          Unable to Load Google Calendar Events
        </h3>
        <p className="max-w-md text-xs text-zinc-400 mb-6">
          {error.includes("401") || error.includes("Unauthorized")
            ? "Your session may have expired, or Calendar OAuth is not yet connected for your account."
            : error}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700"
          >
            Retry
          </button>
          <Link
            href="/api/corsair/connect/calendar"
            onClick={(e) => {
              e.preventDefault();
              onConnectCalendar();
            }}
            className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:from-blue-500 hover:to-indigo-500"
          >
            Connect Google Calendar OAuth
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Calendar Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 px-4 py-3 sm:px-6 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-20">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
              title="Previous period"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
              title="Next period"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h1 className="text-sm font-bold text-zinc-100 min-w-[140px]">
            {getHeaderTitle()}
          </h1>
        </div>

        {/* Right: View mode & Actions */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
            {(["agenda", "day", "week"] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`capitalize px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  viewMode === mode
                    ? "bg-zinc-800 text-white font-semibold shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* New Event Button */}
          <button
            type="button"
            onClick={handleCreateEvent}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Event</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Refresh events"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>
      </div>

      {/* Events View Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        {sortedEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500 border border-zinc-800 mb-4">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-zinc-200 mb-1">
              No Events for this Period
            </h3>
            <p className="max-w-md text-xs text-zinc-400 mb-6">
              Create a new event or sync with Google Calendar.
            </p>
            <button
              type="button"
              onClick={handleCreateEvent}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-colors"
            >
              + Create Event
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 max-w-4xl mx-auto">
            {sortedEvents.map((evt) => {
              const isSelected = selectedEvent?.id === evt.id;

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "border-blue-500/80 bg-zinc-900/90 shadow-md shadow-blue-500/10"
                      : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6.75 3v2.25M17.25 3v2.253M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-zinc-100 truncate">
                        {evt.summary}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        {evt.startTime && (
                          <span className="flex items-center gap-1 font-medium text-zinc-300">
                            <svg className="h-3.5 w-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {evt.startTime} {evt.endTime && `– ${evt.endTime}`}
                          </span>
                        )}

                        {evt.location && (
                          <span className="flex items-center gap-1 text-zinc-400 truncate max-w-[200px]">
                            <svg className="h-3.5 w-3.5 text-zinc-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                            <span className="truncate">{evt.location}</span>
                          </span>
                        )}

                        {evt.attendeesCount !== undefined && evt.attendeesCount > 0 && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                            {evt.attendeesCount} attendees
                          </span>
                        )}
                      </div>

                      {evt.description && (
                        <p className="mt-1.5 text-xs text-zinc-400 line-clamp-1">
                          {evt.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 shrink-0">
                    {evt.hangoutLink && (
                      <a
                        href={evt.hangoutLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 px-3 py-1.5 text-xs font-semibold text-blue-300 transition-colors hover:bg-blue-600/30 hover:text-blue-200"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                        </svg>
                        Join
                      </a>
                    )}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(evt);
                        }}
                        title="Edit event"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(evt.id);
                        }}
                        disabled={isDeletingId === evt.id}
                        title="Delete event"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60">
              <h2 className="text-sm font-semibold text-zinc-100">Event Details</h2>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-zinc-300">
              {/* Title & Status */}
              <div>
                <h3 className="text-lg font-bold text-zinc-100">
                  {selectedEvent.summary}
                </h3>
                {selectedEvent.status && (
                  <span className="mt-1 inline-block rounded bg-zinc-800 px-2 py-0.5 text-[10px] uppercase font-semibold text-zinc-400">
                    Status: {selectedEvent.status}
                  </span>
                )}
              </div>

              {/* Time & Timezone */}
              <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                <svg className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold text-zinc-200">
                    {selectedEvent.startTime} {selectedEvent.endTime && `– ${selectedEvent.endTime}`}
                  </p>
                  {selectedEvent.timeZone && (
                    <p className="text-[11px] text-zinc-500">
                      Timezone: {selectedEvent.timeZone}
                    </p>
                  )}
                </div>
              </div>

              {/* Location */}
              {selectedEvent.location && (
                <div className="flex items-start gap-2.5 rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                  <svg className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-zinc-200">{selectedEvent.location}</p>
                  </div>
                </div>
              )}

              {/* Google Meet link */}
              {selectedEvent.hangoutLink && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                    </svg>
                    <span className="text-xs font-semibold text-blue-200">Google Meet</span>
                  </div>
                  <a
                    href={selectedEvent.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-300 underline hover:text-blue-200"
                  >
                    Join Call &rarr;
                  </a>
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div>
                  <h4 className="font-semibold text-zinc-400 mb-1">Description</h4>
                  <p className="whitespace-pre-wrap leading-relaxed rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-zinc-300">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div>
                  <h4 className="font-semibold text-zinc-400 mb-1">
                    Attendees ({selectedEvent.attendees.length})
                  </h4>
                  <div className="space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 max-h-36 overflow-y-auto">
                    {selectedEvent.attendees.map((att, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-300">
                          {att.displayName || att.email}
                        </span>
                        {att.responseStatus && (
                          <span className="rounded px-1.5 py-0.5 text-[9px] font-medium bg-zinc-800 text-zinc-400 capitalize">
                            {att.responseStatus}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Organizer / Creator */}
              {selectedEvent.organizer?.email && (
                <p className="text-[11px] text-zinc-500">
                  Organizer: {selectedEvent.organizer.displayName || selectedEvent.organizer.email}
                </p>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-950/60">
              <button
                type="button"
                onClick={() => handleDeleteEvent(selectedEvent.id)}
                disabled={isDeletingId === selectedEvent.id}
                className="text-xs font-medium text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {isDeletingId === selectedEvent.id ? "Deleting..." : "Delete Event"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleEditEvent(selectedEvent);
                    setSelectedEvent(null);
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Creation / Edit Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        eventToEdit={eventToEdit}
        onSaved={() => {
          if (eventToEdit && onEventUpdated) onEventUpdated();
          else if (onEventCreated) onEventCreated();
          onRefresh();
        }}
      />
    </div>
  );
}
