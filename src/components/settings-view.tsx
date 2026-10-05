"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useConnections } from "@/hooks/use-connections";

interface SettingsViewProps {
  user?: {
    name?: string | null;
    email?: string | null;
    id?: string | null;
    image?: string | null;
  } | null;
  onConnectGmail: () => void;
  onConnectCalendar: () => void;
}

export function SettingsView({
  user,
  onConnectGmail,
  onConnectCalendar,
}: SettingsViewProps) {
  const [copied, setCopied] = useState(false);
  const { isGmailConnected, isCalendarConnected, isLoading: isConnectionsLoading } = useConnections();

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-100">
            Settings & Integrations
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Manage your Google integrations, Corsair tenant mapping, and AI agent permissions.
          </p>
        </div>

        {/* Profile Card */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            User Profile
          </h2>
          <div className="flex items-center gap-4">
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-12 w-12 rounded-full object-cover border border-zinc-700"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-base font-bold text-white">
                {user?.name?.[0] || user?.email?.[0] || "U"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-zinc-100 truncate">
                {user?.name || "SuperMail User"}
              </h3>
              <p className="text-xs text-zinc-400 truncate">
                {user?.email || "No email available"}
              </p>
              {user?.id && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-zinc-500">
                    ID: {user.id}
                  </span>
                  <button
                    type="button"
                    onClick={copyUserId}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            Connected Google Services
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Gmail Card */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  {isConnectionsLoading ? (
                    <span className="h-5 w-16 rounded-full bg-zinc-800 animate-pulse" />
                  ) : isGmailConnected ? (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      ✓ Connected
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                      Not Connected
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Gmail Integration
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sync email messages, threads, labels, and send messages securely through Corsair tenant storage.
                </p>
              </div>

              {isGmailConnected ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 cursor-default"
                >
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Gmail Connected</span>
                </button>
              ) : (
                <Link
                  href="/api/corsair/connect/gmail"
                  onClick={(e) => {
                    e.preventDefault();
                    onConnectGmail();
                  }}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                >
                  Connect Gmail
                </Link>
              )}
            </div>

            {/* Calendar Card */}
            <div className="flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  {isConnectionsLoading ? (
                    <span className="h-5 w-16 rounded-full bg-zinc-800 animate-pulse" />
                  ) : isCalendarConnected ? (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      ✓ Connected
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                      Not Connected
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  Google Calendar
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Sync upcoming calendar events, schedule details, and Google Meet video links seamlessly.
                </p>
              </div>

              {isCalendarConnected ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-300 cursor-default"
                >
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>Google Calendar Connected</span>
                </button>
              ) : (
                <Link
                  href="/api/corsair/connect/calendar"
                  onClick={(e) => {
                    e.preventDefault();
                    onConnectCalendar();
                  }}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500"
                >
                  Connect Calendar
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* AI Assistant Permissions & Confirmation Policies (Phase 13) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">
              AI Assistant Permissions & Action Policies
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Granular server-enforced permissions and confirmation boundaries for automated agent actions.
            </p>
          </div>

          <div className="space-y-4">
            {/* Gmail Permissions */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-semibold text-zinc-200">
                    Gmail Permissions
                  </h3>
                </div>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                  Server Enforced
                </span>
              </div>

              <div className="divide-y divide-zinc-800/60 text-xs">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Read emails & threads</span>
                  </div>
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">LOW RISK • Direct</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Create drafts</span>
                  </div>
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">LOW RISK • Direct</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Modify labels & star/unstar</span>
                  </div>
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">LOW RISK • Direct</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Send emails & replies</span>
                  </div>
                  <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                    HIGH RISK • Requires Confirmation
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Move emails to trash</span>
                  </div>
                  <span className="rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                    DESTRUCTIVE • Requires Confirmation
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 opacity-60">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">☒</span>
                    <span className="text-zinc-400">Permanent email deletion</span>
                  </div>
                  <span className="rounded bg-zinc-800 text-zinc-500 px-1.5 py-0.5 text-[10px] font-mono">
                    PERMANENTLY BLOCKED
                  </span>
                </div>
              </div>
            </div>

            {/* Google Calendar Permissions */}
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xs font-semibold text-zinc-200">
                    Google Calendar Permissions
                  </h3>
                </div>
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                  Server Enforced
                </span>
              </div>

              <div className="divide-y divide-zinc-800/60 text-xs">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Read schedule & availability</span>
                  </div>
                  <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">LOW RISK • Direct</span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Create calendar events</span>
                  </div>
                  <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                    HIGH RISK • Requires Confirmation
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Update & reschedule events</span>
                  </div>
                  <span className="rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                    HIGH RISK • Requires Confirmation
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">☑</span>
                    <span className="text-zinc-200">Delete calendar events</span>
                  </div>
                  <span className="rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium">
                    DESTRUCTIVE • Requires Confirmation
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 opacity-60">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">☒</span>
                    <span className="text-zinc-400">Purge entire calendar</span>
                  </div>
                  <span className="rounded bg-zinc-800 text-zinc-500 px-1.5 py-0.5 text-[10px] font-mono">
                    PERMANENTLY BLOCKED
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
