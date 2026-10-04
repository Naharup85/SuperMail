"use client";

import React, { useState } from "react";
import { NormalizedEvent } from "@/types/mail";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  eventToEdit?: NormalizedEvent | null;
}

export function EventModal({
  isOpen,
  onClose,
  onSaved,
  eventToEdit,
}: EventModalProps) {
  const isEditing = Boolean(eventToEdit);

  // Helper to format Date for input
  const getInitialDate = () => {
    if (eventToEdit?.rawStart) {
      return eventToEdit.rawStart.toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  };

  const getInitialStartTime = () => {
    if (eventToEdit?.rawStart && !eventToEdit.isAllDay) {
      const hours = String(eventToEdit.rawStart.getHours()).padStart(2, "0");
      const mins = String(eventToEdit.rawStart.getMinutes()).padStart(2, "0");
      return `${hours}:${mins}`;
    }
    // Default next top of hour
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    return `${String(now.getHours()).padStart(2, "0")}:00`;
  };

  const getInitialEndTime = () => {
    if (eventToEdit?.rawEnd && !eventToEdit.isAllDay) {
      const hours = String(eventToEdit.rawEnd.getHours()).padStart(2, "0");
      const mins = String(eventToEdit.rawEnd.getMinutes()).padStart(2, "0");
      return `${hours}:${mins}`;
    }
    const now = new Date();
    now.setHours(now.getHours() + 2, 0, 0, 0);
    return `${String(now.getHours()).padStart(2, "0")}:00`;
  };

  const [summary, setSummary] = useState(eventToEdit?.summary || "");
  const [date, setDate] = useState(getInitialDate());
  const [startTime, setStartTime] = useState(getInitialStartTime());
  const [endTime, setEndTime] = useState(getInitialEndTime());
  const [isAllDay, setIsAllDay] = useState(eventToEdit?.isAllDay || false);
  const [location, setLocation] = useState(eventToEdit?.location || "");
  const [description, setDescription] = useState(eventToEdit?.description || "");
  const [attendeesStr, setAttendeesStr] = useState(
    eventToEdit?.attendees?.map((a) => a.email).filter(Boolean).join(", ") || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      setError("Event title is required");
      return;
    }

    if (!date) {
      setError("Event date is required");
      return;
    }

    let startPayload: { dateTime?: string; date?: string; timeZone?: string };
    let endPayload: { dateTime?: string; date?: string; timeZone?: string };

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    if (isAllDay) {
      startPayload = { date };
      endPayload = { date };
    } else {
      if (!startTime || !endTime) {
        setError("Start and end times are required");
        return;
      }

      const startDateTime = new Date(`${date}T${startTime}:00`);
      const endDateTime = new Date(`${date}T${endTime}:00`);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setError("Invalid date or time format");
        return;
      }

      if (endDateTime <= startDateTime) {
        setError("End time must be after start time");
        return;
      }

      startPayload = {
        dateTime: startDateTime.toISOString(),
        timeZone,
      };
      endPayload = {
        dateTime: endDateTime.toISOString(),
        timeZone,
      };
    }

    // Parse attendees
    const attendees = attendeesStr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.includes("@"))
      .map((email) => ({ email }));

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing
        ? `/api/calendar/events/${eventToEdit?.id}`
        : "/api/calendar/events";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: summary.trim(),
          description: description.trim() || undefined,
          location: location.trim() || undefined,
          start: startPayload,
          end: endPayload,
          attendees: attendees.length > 0 ? attendees : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Failed to save event (${res.status})`);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save event";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <h2 className="text-sm font-semibold text-zinc-100">
            {isEditing ? "Edit Calendar Event" : "Create Calendar Event"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="px-5 py-2.5 bg-red-500/10 border-b border-red-500/20 text-xs text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              &times;
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Summary / Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Event Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Product Review & Planning"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
              autoFocus
            />
          </div>

          {/* Date & All day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="allDay"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="allDay" className="text-xs text-zinc-300 cursor-pointer">
                All-day event
              </label>
            </div>
          </div>

          {/* Time pickers (if not all day) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Location / Video Call
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Conference Room A or Google Meet"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Attendees (comma separated emails)
            </label>
            <input
              type="text"
              value={attendeesStr}
              onChange={(e) => setAttendeesStr(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add agenda, meeting notes, or details..."
              rows={3}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Create Event"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
