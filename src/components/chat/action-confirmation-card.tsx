"use client";

import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GMAIL_MESSAGES_KEY, GMAIL_THREAD_KEY } from "@/hooks/use-mail";
import { CALENDAR_EVENTS_KEY, CALENDAR_EVENT_KEY } from "@/hooks/use-calendar";
import type {
  ActionPreview,
  HighImpactActionType,
  ActionCardState,
  EmailActionPreview,
  TrashMessagePreview,
  CalendarCreatePreview,
  CalendarUpdatePreview,
  CalendarDeletePreview,
  AutomationActionPreview,
} from "@/types/agent-actions";

export const AUTOMATIONS_KEY = "automations";

interface ActionConfirmationCardProps {
  actionId: string;
  confirmationToken: string;
  actionType: HighImpactActionType;
  preview: ActionPreview;
  initialState?: ActionCardState;
}

export function ActionConfirmationCard({
  actionId,
  confirmationToken,
  actionType,
  preview,
  initialState = "pending_confirmation",
}: ActionConfirmationCardProps) {
  const [state, setState] = useState<ActionCardState>(initialState);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Invalidate relevant React Query caches upon successful action execution
  const handleInvalidateQueries = () => {
    if (
      actionType === "send_email" ||
      actionType === "send_reply" ||
      actionType === "trash_message"
    ) {
      queryClient.invalidateQueries({ queryKey: [GMAIL_MESSAGES_KEY] });
      queryClient.invalidateQueries({ queryKey: [GMAIL_THREAD_KEY] });
    } else if (
      actionType === "create_calendar_event" ||
      actionType === "update_calendar_event" ||
      actionType === "delete_calendar_event"
    ) {
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENTS_KEY] });
      queryClient.invalidateQueries({ queryKey: [CALENDAR_EVENT_KEY] });
    } else if (
      actionType === "create_automation" ||
      actionType === "update_automation" ||
      actionType === "delete_automation"
    ) {
      queryClient.invalidateQueries({ queryKey: [AUTOMATIONS_KEY] });
    }
  };

  const handleConfirm = async () => {
    setState("executing");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId,
          confirmationToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setState("failed");
        setErrorMessage(data?.error || "Action execution failed.");
        return;
      }

      setState("confirmed");
      setResultMessage(data.message || "Action executed successfully.");
      handleInvalidateQueries();
    } catch (err) {
      setState("failed");
      setErrorMessage(
        err instanceof Error ? err.message : "Network error during execution.",
      );
    }
  };

  const handleCancel = async () => {
    setState("cancelled");
    try {
      await fetch("/api/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionId,
          confirmationToken,
          cancel: true,
        }),
      });
    } catch {
      // Ignored for cancel
    }
  };

  const isDestructive =
    actionType === "trash_message" ||
    actionType === "delete_calendar_event" ||
    actionType === "delete_automation";

  const getActionTitle = () => {
    switch (actionType) {
      case "send_email":
        return "Send Email";
      case "send_reply":
        return "Send Reply";
      case "trash_message":
        return "Move Email to Trash";
      case "create_calendar_event":
        return "Schedule Calendar Event";
      case "update_calendar_event":
        return "Update Calendar Event";
      case "delete_calendar_event":
        return "Delete Calendar Event";
      case "create_automation":
        return "Create Automation";
      case "update_automation":
        return "Update Automation";
      case "delete_automation":
        return "Delete Automation";
      default:
        return "Execute Action";
    }
  };

  const getActionIcon = () => {
    if (actionType === "send_email" || actionType === "send_reply") {
      return (
        <svg className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    if (actionType === "trash_message" || actionType === "delete_calendar_event" || actionType === "delete_automation") {
      return (
        <svg className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    }
    if (actionType === "create_automation" || actionType === "update_automation") {
      return (
        <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  };

  const emailPreview = preview as EmailActionPreview;
  const trashPreview = preview as TrashMessagePreview;
  const calCreate = preview as CalendarCreatePreview;
  const calUpdate = preview as CalendarUpdatePreview;
  const calDelete = preview as CalendarDeletePreview;
  const autoPreview = preview as AutomationActionPreview;

  return (
    <div
      className={`my-3 overflow-hidden rounded-xl border transition-all ${
        isDestructive
          ? "border-rose-500/30 bg-rose-950/20 shadow-lg shadow-rose-950/20"
          : "border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/40"
      }`}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-zinc-800 border border-zinc-700/60">
            {getActionIcon()}
          </div>
          <span className="text-xs font-semibold text-zinc-100">
            {getActionTitle()}
          </span>
        </div>

        {/* State Badge */}
        <div>
          {state === "pending_confirmation" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Awaiting Confirmation
            </span>
          )}
          {state === "executing" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              <svg className="h-2.5 w-2.5 animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Executing...
            </span>
          )}
          {state === "confirmed" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
              <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Action Completed
            </span>
          )}
          {state === "cancelled" && (
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700/60">
              Cancelled
            </span>
          )}
          {state === "failed" && (
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
              Failed
            </span>
          )}
        </div>
      </div>

      {/* Structured Action Preview Body */}
      <div className="p-3.5 text-xs text-zinc-300 space-y-2.5">
        {/* Email / Reply Preview */}
        {(actionType === "send_email" || actionType === "send_reply") && (
          <div className="space-y-2">
            <div className="grid grid-cols-[60px_1fr] gap-1 text-[11px]">
              <span className="text-zinc-400 font-medium">To:</span>
              <span className="text-zinc-100 font-semibold">{emailPreview.recipient}</span>
            </div>
            {emailPreview.cc && (
              <div className="grid grid-cols-[60px_1fr] gap-1 text-[11px]">
                <span className="text-zinc-400 font-medium">Cc:</span>
                <span className="text-zinc-300">{emailPreview.cc}</span>
              </div>
            )}
            <div className="grid grid-cols-[60px_1fr] gap-1 text-[11px]">
              <span className="text-zinc-400 font-medium">Subject:</span>
              <span className="text-zinc-200">{emailPreview.subject || "(No subject)"}</span>
            </div>
            <div className="mt-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
              {emailPreview.body}
            </div>
          </div>
        )}

        {/* Trash Email Preview */}
        {actionType === "trash_message" && (
          <div className="space-y-2">
            {trashPreview.subject && (
              <div className="text-xs">
                <span className="text-zinc-400">Subject: </span>
                <span className="font-semibold text-zinc-100">{trashPreview.subject}</span>
              </div>
            )}
            {trashPreview.sender && (
              <div className="text-xs">
                <span className="text-zinc-400">From: </span>
                <span className="text-zinc-300">{trashPreview.sender}</span>
              </div>
            )}
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300">
              {trashPreview.warning}
            </div>
          </div>
        )}

        {/* Calendar Create Preview */}
        {actionType === "create_calendar_event" && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-zinc-100">{calCreate.title}</div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/60">
              <div>
                <span className="text-zinc-500 block">Date</span>
                <span className="font-medium text-zinc-200">{calCreate.date}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Time</span>
                <span className="font-medium text-zinc-200">
                  {calCreate.start ? new Date(calCreate.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Start"}{" "}
                  - {calCreate.end ? new Date(calCreate.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "End"}
                </span>
              </div>
              {calCreate.location && (
                <div className="col-span-2">
                  <span className="text-zinc-500 block">Location</span>
                  <span className="text-zinc-200">{calCreate.location}</span>
                </div>
              )}
              {calCreate.attendees && calCreate.attendees.length > 0 && (
                <div className="col-span-2">
                  <span className="text-zinc-500 block">Attendees</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {calCreate.attendees.map((att, i) => (
                      <span key={i} className="rounded bg-indigo-500/10 text-indigo-300 px-1.5 py-0.5 text-[10px] border border-indigo-500/20">
                        {att}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {calCreate.description && (
              <p className="text-[11px] text-zinc-400 italic">{calCreate.description}</p>
            )}
          </div>
        )}

        {/* Calendar Update Preview */}
        {actionType === "update_calendar_event" && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-zinc-100">
              {calUpdate.title || calUpdate.originalTitle || "Update Event"}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-800/60">
              {calUpdate.date && (
                <div>
                  <span className="text-zinc-500 block">New Date</span>
                  <span className="font-medium text-zinc-200">{calUpdate.date}</span>
                </div>
              )}
              {calUpdate.start && (
                <div>
                  <span className="text-zinc-500 block">New Time</span>
                  <span className="font-medium text-zinc-200">
                    {new Date(calUpdate.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {calUpdate.end && ` - ${new Date(calUpdate.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </span>
                </div>
              )}
              {calUpdate.location && (
                <div className="col-span-2">
                  <span className="text-zinc-500 block">Updated Location</span>
                  <span className="text-zinc-200">{calUpdate.location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calendar Delete Preview */}
        {actionType === "delete_calendar_event" && (
          <div className="space-y-2">
            {calDelete.title && (
              <div className="text-xs">
                <span className="text-zinc-400">Meeting: </span>
                <span className="font-bold text-zinc-100">{calDelete.title}</span>
              </div>
            )}
            {calDelete.date && (
              <div className="text-xs text-zinc-400">
                Scheduled for: <span className="text-zinc-200">{calDelete.date}</span>
              </div>
            )}
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300">
              {calDelete.warning}
            </div>
          </div>
        )}

        {/* Automation Create Preview */}
        {actionType === "create_automation" && autoPreview && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-100">{autoPreview.name}</span>
              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                {autoPreview.isReadOnly ? "Read-Only Workflow" : "Write Workflow"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-300 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
              <div>
                <span className="text-zinc-500 block">Schedule</span>
                <span className="font-medium text-amber-400">{autoPreview.scheduleDescription}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Timezone</span>
                <span className="font-medium text-zinc-200">{autoPreview.timezone}</span>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500 block">Task Instruction</span>
                <p className="mt-0.5 text-zinc-200 font-mono text-[11px] bg-zinc-900/80 p-2 rounded border border-zinc-800">
                  {autoPreview.instruction}
                </p>
              </div>
              {autoPreview.allowedTools && autoPreview.allowedTools.length > 0 && (
                <div className="col-span-2">
                  <span className="text-zinc-500 block">Allowed Tools</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {autoPreview.allowedTools.map((t, idx) => (
                      <span key={idx} className="rounded bg-zinc-800 text-zinc-300 px-1.5 py-0.5 text-[10px] border border-zinc-700/60">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {autoPreview.warning && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2 text-[11px] text-amber-300">
                {autoPreview.warning}
              </div>
            )}
          </div>
        )}

        {/* Automation Delete Preview */}
        {actionType === "delete_automation" && autoPreview && (
          <div className="space-y-2">
            <div className="text-xs">
              <span className="text-zinc-400">Automation: </span>
              <span className="font-bold text-zinc-100">{autoPreview.name}</span>
            </div>
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300">
              {autoPreview.warning || "This will permanently delete this automation and cancel upcoming executions."}
            </div>
          </div>
        )}

        {/* Result & Error banners */}
        {resultMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-xs text-emerald-300">
            <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{resultMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2 text-xs text-rose-300">
            <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Action Confirmation Buttons (Only in pending or failed states) */}
      {(state === "pending_confirmation" || state === "failed") && (
        <div className="flex items-center justify-end gap-2 border-t border-zinc-800/80 bg-zinc-950/50 px-3.5 py-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all ${
              isDestructive
                ? "bg-rose-600 shadow-rose-600/20 hover:bg-rose-500"
                : "bg-gradient-to-r from-indigo-600 to-purple-600 shadow-indigo-600/20 hover:from-indigo-500 hover:to-purple-500"
            }`}
          >
            {isDestructive
              ? "Confirm & Delete"
              : actionType.startsWith("send")
                ? "Send Email"
                : "Confirm Action"}
          </button>
        </div>
      )}
    </div>
  );
}
