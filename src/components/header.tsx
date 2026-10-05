"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useConnections } from "@/hooks/use-connections";

interface HeaderProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleMobileSidebar: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  signOutAction: () => Promise<void>;
}

export function Header({
  user,
  searchQuery,
  onSearchChange,
  onToggleMobileSidebar,
  onRefresh,
  isRefreshing = false,
  signOutAction,
}: HeaderProps) {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [connectingService, setConnectingService] = useState<string | null>(null);

  const { isGmailConnected, isCalendarConnected, isLoading: isConnectionsLoading } = useConnections();

  const handleConnect = async (service: "gmail" | "calendar") => {
    if ((service === "gmail" && isGmailConnected) || (service === "calendar" && isCalendarConnected)) {
      return;
    }
    try {
      setConnectingService(service);
      const res = await fetch(`/api/corsair/connect/${service}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          window.location.assign(data.url);
          return;
        }
      }
      router.push(`/api/corsair/connect/${service}`);
    } catch {
      router.push(`/api/corsair/connect/${service}`);
    } finally {
      setTimeout(() => setConnectingService(null), 2000);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOutAction();
    } catch {
      router.push("/api/auth/signout");
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile Menu & Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 md:hidden"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <div className="hidden sm:block">
            <span className="bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-base font-bold tracking-tight text-transparent">
              SuperMail
            </span>
            <span className="ml-1.5 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
              PRO
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Search Bar */}
      <div className="mx-4 max-w-lg flex-1">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search mail by sender, subject, or content..."
            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-9 pr-8 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all focus:border-indigo-500/60 focus:bg-zinc-900 focus:ring-1 focus:ring-indigo-500/30"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Right: Quick actions & User Profile */}
      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh messages & calendar"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 ${isRefreshing ? "animate-spin text-indigo-400" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
        </button>

        {/* Quick Connect Actions (Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5">
          {isConnectionsLoading ? (
            <div className="h-8 w-28 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
          ) : isGmailConnected ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 cursor-default"
            >
              <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Gmail Connected</span>
            </button>
          ) : (
            <Link
              href="/api/corsair/connect/gmail"
              onClick={(e) => {
                e.preventDefault();
                handleConnect("gmail");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300"
            >
              <span className="h-2 w-2 rounded-full bg-red-400"></span>
              {connectingService === "gmail" ? "Connecting..." : "Connect Gmail"}
            </Link>
          )}

          {isConnectionsLoading ? (
            <div className="h-8 w-32 rounded-lg bg-zinc-900 border border-zinc-800 animate-pulse" />
          ) : isCalendarConnected ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 cursor-default"
            >
              <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Calendar Connected</span>
            </button>
          ) : (
            <Link
              href="/api/corsair/connect/calendar"
              onClick={(e) => {
                e.preventDefault();
                handleConnect("calendar");
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-300"
            >
              <span className="h-2 w-2 rounded-full bg-blue-400"></span>
              {connectingService === "calendar" ? "Connecting..." : "Connect Calendar"}
            </Link>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 p-0.5 text-left transition-colors hover:border-zinc-700"
          >
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt={user.name || "User Avatar"}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs font-semibold text-white">
                {userInitials}
              </div>
            )}
            <span className="hidden pr-2 text-xs font-medium text-zinc-200 sm:inline-block max-w-[120px] truncate">
              {user?.name || user?.email || "Account"}
            </span>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-zinc-800 bg-zinc-900 p-2 shadow-2xl shadow-black/80">
                <div className="border-b border-zinc-800 px-3 py-2.5">
                  <p className="text-xs font-semibold text-zinc-100 truncate">
                    {user?.name || "SuperMail User"}
                  </p>
                  <p className="text-[11px] text-zinc-400 truncate">
                    {user?.email || "No email provided"}
                  </p>
                </div>

                <div className="py-1">
                  {isGmailConnected ? (
                    <div className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 my-0.5">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                        <span>Gmail Connected</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400">✓</span>
                    </div>
                  ) : (
                    <Link
                      href="/api/corsair/connect/gmail"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowUserMenu(false);
                        handleConnect("gmail");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                    >
                      <svg className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                      </svg>
                      Connect Gmail
                    </Link>
                  )}

                  {isCalendarConnected ? (
                    <div className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 my-0.5">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Calendar Connected</span>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-400">✓</span>
                    </div>
                  ) : (
                    <Link
                      href="/api/corsair/connect/calendar"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowUserMenu(false);
                        handleConnect("calendar");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                    >
                      <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Connect Google Calendar
                    </Link>
                  )}
                </div>

                <div className="border-t border-zinc-800 pt-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.75}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                      />
                    </svg>
                    {isSigningOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
