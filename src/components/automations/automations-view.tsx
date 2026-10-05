"use client";

import React, { useState } from "react";
import {
  useAutomations,
  useCreateAutomation,
  useDeleteAutomation,
  usePauseAutomation,
  useResumeAutomation,
  useRunAutomation,
  useAutomationRuns,
} from "@/hooks/use-automations";
import type {
  AutomationRecord,
  CreateAutomationInput,
  ScheduleType,
} from "@/types/automations";
import { formatScheduleDescription } from "@/server/automations/scheduler";

interface AutomationsViewProps {
  onConnectService?: (service: "gmail" | "calendar") => void;
}

export function AutomationsView({}: AutomationsViewProps) {
  const { data: automations = [], isLoading, refetch, isRefetching } = useAutomations();

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [historyAutomationId, setHistoryAutomationId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const deleteMutation = useDeleteAutomation();
  const pauseMutation = usePauseAutomation();
  const resumeMutation = useResumeAutomation();
  const runMutation = useRunAutomation();

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionErrorMessage(msg);
      setTimeout(() => setActionErrorMessage(null), 4000);
    } else {
      setActionSuccessMessage(msg);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  const handleRunNow = async (id: string, name: string) => {
    try {
      showNotification(`Executing "${name}"...`);
      const res = await runMutation.mutateAsync(id);
      showNotification(
        res.status === "succeeded"
          ? `"${name}" executed successfully.`
          : `"${name}" run failed: ${res.error || "Unknown error"}`,
        res.status !== "succeeded",
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Run failed";
      showNotification(msg, true);
    }
  };

  const handleTogglePause = async (a: AutomationRecord) => {
    try {
      if (a.status === "ACTIVE") {
        await pauseMutation.mutateAsync(a.id);
        showNotification(`Automation "${a.name}" paused.`);
      } else {
        await resumeMutation.mutateAsync(a.id);
        showNotification(`Automation "${a.name}" resumed.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Toggle failed";
      showNotification(msg, true);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the automation "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      showNotification(`Automation "${name}" deleted.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      showNotification(msg, true);
    }
  };

  const filteredAutomations = automations.filter((a) => {
    if (filterStatus !== "ALL" && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        a.instruction.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = automations.filter((a) => a.status === "ACTIVE").length;
  const pausedCount = automations.filter((a) => a.status === "PAUSED").length;

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-zinc-950 p-4 md:p-6">
      {/* Top Banner Notifications */}
      {actionSuccessMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300 shadow-lg shadow-emerald-950/20">
          <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {actionErrorMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-300 shadow-lg shadow-rose-950/20">
          <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{actionErrorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Automations & Scheduled Workflows
              </h1>
              <p className="text-xs text-zinc-400">
                Scheduled email summaries, calendar briefings, and automated assistant tasks.
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <svg
              className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-indigo-400" : "text-zinc-400"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-orange-600/25 transition-all hover:from-amber-400 hover:to-orange-500 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span>New Automation</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
          <span className="text-[11px] font-medium text-zinc-400">Total Workflows</span>
          <div className="mt-1 text-2xl font-bold text-zinc-100">{automations.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
          <span className="text-[11px] font-medium text-emerald-400">Active Workflows</span>
          <div className="mt-1 text-2xl font-bold text-emerald-400">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
          <span className="text-[11px] font-medium text-amber-400">Paused</span>
          <div className="mt-1 text-2xl font-bold text-amber-400">{pausedCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5">
          <span className="text-[11px] font-medium text-indigo-400">Policy Guarded</span>
          <div className="mt-1 text-xs font-semibold text-indigo-300 mt-2">Phase 13 Protected</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "ACTIVE", "PAUSED", "COMPLETED", "FAILED"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterStatus === status
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              }`}
            >
              {status === "ALL" ? "All Automations" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 pl-8 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Automations Grid / List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-zinc-800/80 bg-zinc-900/30 animate-pulse" />
          ))}
        </div>
      ) : filteredAutomations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800/80 bg-zinc-900/20 p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-3 text-sm font-semibold text-zinc-200">No automations found</h3>
          <p className="mt-1 text-xs text-zinc-500 max-w-sm">
            {searchQuery || filterStatus !== "ALL"
              ? "No automations match your search criteria."
              : "Create your first automated workflow to summarize emails, prepare calendar briefings, and more."}
          </p>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white"
          >
            + Create Automation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredAutomations.map((automation) => {
            const isRunning = runMutation.isPending && runMutation.variables === automation.id;
            const scheduleText = formatScheduleDescription(automation.schedule, automation.timezone);

            return (
              <div
                key={automation.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 shadow-sm transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <div>
                  {/* Card Header: Title & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-100">{automation.name}</h3>
                      {automation.description && (
                        <p className="mt-0.5 text-xs text-zinc-400">{automation.description}</p>
                      )}
                    </div>
                    <div>
                      {automation.status === "ACTIVE" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      )}
                      {automation.status === "PAUSED" && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                          Paused
                        </span>
                      )}
                      {automation.status === "COMPLETED" && (
                        <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                          Completed
                        </span>
                      )}
                      {automation.status === "FAILED" && (
                        <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Schedule & Timezone Pill */}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-amber-400/90 font-medium">
                    <svg className="h-3.5 w-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{scheduleText}</span>
                  </div>

                  {/* Task Instruction */}
                  <div className="mt-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 text-xs text-zinc-300 font-mono leading-relaxed line-clamp-3">
                    {automation.instruction}
                  </div>

                  {/* Allowed Tools Pills */}
                  {automation.allowedTools && automation.allowedTools.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {automation.allowedTools.map((toolName, i) => (
                        <span
                          key={i}
                          className="rounded bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400"
                        >
                          {toolName.replace(".api.", ".")}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Last Run & Next Run Metadata */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-800/60 pt-2.5 text-[10px] text-zinc-400">
                    <div>
                      <span className="text-zinc-500">Next execution:</span>{" "}
                      <span className="text-zinc-300 font-medium">
                        {automation.nextRunAt
                          ? new Date(automation.nextRunAt).toLocaleString("en-US", {
                              timeZone: automation.timezone,
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Last run:</span>{" "}
                      <span className="text-zinc-300 font-medium">
                        {automation.lastRunAt
                          ? new Date(automation.lastRunAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })
                          : "Never"}
                      </span>
                    </div>
                  </div>

                  {/* Recent Result Summary */}
                  {automation.lastRunResult && (
                    <div className="mt-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 p-2 text-[11px] text-zinc-300">
                      <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">
                        Latest Result
                      </div>
                      <p className="line-clamp-2 text-zinc-300">{automation.lastRunResult}</p>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRunNow(automation.id, automation.name)}
                      disabled={isRunning}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
                    >
                      {isRunning ? (
                        <svg className="h-3 w-3 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      )}
                      <span>Run Now</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePause(automation)}
                      className="rounded-lg border border-zinc-700/80 bg-zinc-800/80 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      {automation.status === "ACTIVE" ? "Pause" : "Resume"}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setHistoryAutomationId(automation.id)}
                      className="rounded-lg border border-zinc-700/80 bg-zinc-800/60 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    >
                      History
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(automation.id, automation.name)}
                      className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Automation Modal */}
      {isCreateOpen && (
        <CreateAutomationModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={(newAuto) => {
            setIsCreateOpen(false);
            showNotification(`Automation "${newAuto.name}" created successfully.`);
          }}
        />
      )}

      {/* Run History Drawer */}
      {historyAutomationId && (
        <AutomationHistoryModal
          automationId={historyAutomationId}
          onClose={() => setHistoryAutomationId(null)}
        />
      )}
    </div>
  );
}

/**
 * Create Automation Modal
 */
function CreateAutomationModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (created: AutomationRecord) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleType, setScheduleType] = useState<ScheduleType>("daily");
  const [time, setTime] = useState("09:00");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [datetime, setDatetime] = useState("");
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      return "Asia/Kolkata";
    }
  });
  const [instruction, setInstruction] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateAutomation();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Automation name is required.");
      return;
    }

    if (!instruction.trim()) {
      setErrorMessage("Task instruction is required.");
      return;
    }

    const input: CreateAutomationInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      schedule: {
        type: scheduleType,
        time: scheduleType === "one_time" ? undefined : time,
        daysOfWeek: scheduleType === "weekly" ? daysOfWeek : undefined,
        datetime: scheduleType === "one_time" ? datetime : undefined,
      },
      timezone,
      instruction: instruction.trim(),
      allowedTools: [
        "gmail.api.messages.list",
        "gmail.api.messages.get",
        "googlecalendar.api.events.getMany",
      ],
    };

    try {
      const created = await createMutation.mutateAsync(input);
      onCreated(created);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Creation failed";
      setErrorMessage(msg);
    }
  };

  const dayLabels = [
    { num: 0, label: "Sun" },
    { num: 1, label: "Mon" },
    { num: 2, label: "Tue" },
    { num: 3, label: "Wed" },
    { num: 4, label: "Thu" },
    { num: 5, label: "Fri" },
    { num: 6, label: "Sat" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <h2 className="text-base font-bold text-zinc-100">Create New Automation</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-300">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300">Automation Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Morning Email Summary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300">Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Daily briefing of unread emails at 9 AM"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300">Schedule Type</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekdays">Weekdays (Mon - Fri)</option>
                <option value="weekly">Weekly (Specific Days)</option>
                <option value="one_time">One-time</option>
              </select>
            </div>

            {scheduleType !== "one_time" ? (
              <div>
                <label className="block text-xs font-semibold text-zinc-300">Time (24h)</label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-zinc-300">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {scheduleType === "weekly" && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Days of Week</label>
              <div className="flex gap-1.5">
                {dayLabels.map((d) => {
                  const isSelected = daysOfWeek.includes(d.num);
                  return (
                    <button
                      key={d.num}
                      type="button"
                      onClick={() => {
                        setDaysOfWeek((prev) =>
                          isSelected ? prev.filter((x) => x !== d.num) : [...prev, d.num],
                        );
                      }}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-all ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300">Timezone</label>
            <input
              type="text"
              required
              placeholder="Asia/Kolkata"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300">Task Instruction</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Check unread emails received in the last 24 hours and summarize key action items."
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-zinc-800/80 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:from-amber-400 hover:to-orange-500 disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Automation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Automation Run History Modal
 */
function AutomationHistoryModal({
  automationId,
  onClose,
}: {
  automationId: string;
  onClose: () => void;
}) {
  const { data: runs = [], isLoading } = useAutomationRuns(automationId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-zinc-100">Automation Run History</h2>
            <p className="text-xs text-zinc-400">Chronological log of past workflow executions.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-zinc-900/50 animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No executions recorded for this automation yet.
            </div>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        run.status === "succeeded"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : run.status === "failed"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      }`}
                    >
                      {run.status.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </div>

                  <span className="text-[10px] text-zinc-500">
                    Duration: {run.durationMs ? `${run.durationMs}ms` : "N/A"}
                  </span>
                </div>

                {run.summary && (
                  <p className="rounded-lg bg-zinc-950/60 p-2.5 font-mono text-[11px] text-zinc-200 leading-relaxed">
                    {run.summary}
                  </p>
                )}

                {run.error && (
                  <p className="rounded-lg bg-rose-500/10 p-2 text-[11px] text-rose-300">
                    Error ({run.errorCategory || "Execution"}): {run.error}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
