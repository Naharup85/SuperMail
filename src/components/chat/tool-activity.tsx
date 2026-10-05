"use client";

import React from "react";

interface ToolActivityProps {
  toolName: string;
  state:
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "approval-responded"
    | "output-available"
    | "output-error"
    | "output-denied"
    | string;
  errorText?: string;
}

/**
 * Returns a human-friendly label and icon for a Corsair tool operation.
 */
function getToolMetadata(rawName: string) {
  const normalized = rawName.replace(/^tool-/, "").toLowerCase();

  if (normalized.includes("messages_list") || normalized.includes("messages.list")) {
    return {
      action: "Searching Gmail",
      activeText: "Searching your inbox...",
      doneText: "Searched Gmail messages",
      icon: "mail",
      color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    };
  }
  if (normalized.includes("messages_get") || normalized.includes("messages.get")) {
    return {
      action: "Reading Email",
      activeText: "Opening email details...",
      doneText: "Retrieved email details",
      icon: "mail",
      color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    };
  }
  if (normalized.includes("threads_list") || normalized.includes("threads.list")) {
    return {
      action: "Searching Threads",
      activeText: "Searching email conversations...",
      doneText: "Searched conversation threads",
      icon: "mail",
      color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    };
  }
  if (normalized.includes("threads_get") || normalized.includes("threads.get")) {
    return {
      action: "Reading Thread",
      activeText: "Opening conversation thread...",
      doneText: "Retrieved full conversation",
      icon: "mail",
      color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    };
  }
  if (normalized.includes("labels")) {
    return {
      action: "Checking Labels",
      activeText: "Checking Gmail labels...",
      doneText: "Checked Gmail labels",
      icon: "tag",
      color: "text-purple-400 border-purple-500/20 bg-purple-500/10",
    };
  }
  if (normalized.includes("events_getmany") || normalized.includes("events.getmany")) {
    return {
      action: "Checking Calendar",
      activeText: "Checking your calendar schedule...",
      doneText: "Retrieved calendar events",
      icon: "calendar",
      color: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    };
  }
  if (normalized.includes("events_get") || normalized.includes("events.get")) {
    return {
      action: "Reading Event",
      activeText: "Fetching meeting details...",
      doneText: "Retrieved event details",
      icon: "calendar",
      color: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    };
  }
  if (normalized.includes("availability")) {
    return {
      action: "Checking Availability",
      activeText: "Checking your free/busy schedule...",
      doneText: "Checked availability",
      icon: "calendar",
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    };
  }

  return {
    action: "Querying Tool",
    activeText: "Retrieving information...",
    doneText: "Information retrieved",
    icon: "sparkles",
    color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/10",
  };
}

export function ToolActivity({ toolName, state, errorText }: ToolActivityProps) {
  const meta = getToolMetadata(toolName);
  const isLoading = state === "input-streaming" || state === "input-available";
  const isError = state === "output-error";

  return (
    <div
      className={`my-1.5 inline-flex items-center gap-2 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
        isError
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : meta.color
      }`}
    >
      {isLoading ? (
        <svg
          className="h-3.5 w-3.5 animate-spin text-current shrink-0"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : isError ? (
        <svg
          className="h-3.5 w-3.5 text-red-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      ) : (
        <svg
          className="h-3.5 w-3.5 text-emerald-400 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      )}

      <span>
        {isLoading
          ? meta.activeText
          : isError
            ? errorText || "Operation error"
            : meta.doneText}
      </span>
    </div>
  );
}
